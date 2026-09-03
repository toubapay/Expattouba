import { db } from './index.ts';
import { listings, transactions, users, vendors } from './schema.ts';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getCurrentPlanForVendor } from './vendorSubscriptions.ts';
import { getEffectiveFees, getSettings } from './settings.ts';

export class InsufficientFundsError extends Error {}
export class ListingUnavailableError extends Error {}
export class OwnListingError extends Error {}
export class PurchaseDisabledError extends Error {}

export async function listTransactionsForUser(userId: string, limit = 50) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

/**
 * Admin wallet credit/debit (src/routes/admin.ts). A negative amount is a
 * debit, guarded the same way a purchase debit is: the balance check and
 * the update are one statement, so it can't act on a balance that was
 * already stale by the time this runs.
 */
export async function adjustWalletForUser(userId: string, amountFcfa: number, note: string) {
  return db.transaction(async (tx) => {
    const type = amountFcfa >= 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const guard =
      amountFcfa >= 0
        ? eq(users.id, userId)
        : and(eq(users.id, userId), sql`${users.walletBalance} >= ${-amountFcfa}`);

    const updated = await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${amountFcfa}` })
      .where(guard)
      .returning();
    if (updated.length === 0) throw new InsufficientFundsError('Solde insuffisant pour ce retrait');

    await tx.insert(transactions).values({
      userId,
      amount: Math.abs(amountFcfa).toString(),
      type,
      status: 'COMPLETED',
      gateway: 'MANUAL',
      note,
    });
    // Same reasoning as getUserWithVendor: this row goes straight back to
    // the admin client as the response body, and pin/passwordHash (hashed
    // or not) must never leave the server.
    const { pin, passwordHash, ...user } = updated[0];
    return user;
  });
}

/**
 * Buying a listing with wallet balance. Everything here happens in one
 * database transaction and each write is itself a conditional
 * UPDATE...WHERE, not a read-then-write — the same "claim it atomically
 * before the money moves" reasoning as the sister app's claimForPayment:
 * two buyers racing the same listing, or a balance that changed between
 * this request's read and its write, must not both succeed.
 *
 * Order matters: the listing is claimed (flipped to SOLD) before the
 * buyer is debited, so a claim failure (already sold) never touches a
 * wallet, and a debit failure (insufficient funds) rolls the whole
 * transaction — including the claim — back via the surrounding
 * db.transaction.
 */
export async function purchaseListing(buyerId: string, listingId: string) {
  // The admin's "Achat en application" toggle (Paramètres) was, until now,
  // only a UI hint — ProductDetailView hid the button, but this route
  // itself never checked it, so a disabled toggle didn't actually stop a
  // direct POST here. That's the real enforcement point; hiding the
  // button is just the honest reflection of it, not the mechanism.
  const { walletPurchaseEnabled } = await getSettings();
  if (!walletPurchaseEnabled) throw new PurchaseDisabledError("L'achat via le portefeuille est désactivé pour le moment");

  return db.transaction(async (tx) => {
    const listingRows = await tx.select().from(listings).where(eq(listings.id, listingId)).limit(1);
    const listing = listingRows[0];
    if (!listing) throw new ListingUnavailableError('Annonce introuvable');
    if (listing.status !== 'ACTIVE') throw new ListingUnavailableError("Cette annonce n'est plus disponible");

    const vendorRows = await tx.select().from(vendors).where(eq(vendors.id, listing.vendorId)).limit(1);
    const vendor = vendorRows[0];
    if (!vendor) throw new ListingUnavailableError('Vendeur introuvable');
    if (vendor.userId === buyerId) throw new OwnListingError('Vous ne pouvez pas acheter votre propre annonce');

    const price = Math.round(Number(listing.price));

    const claimed = await tx
      .update(listings)
      .set({ status: 'SOLD' })
      .where(and(eq(listings.id, listingId), eq(listings.status, 'ACTIVE')))
      .returning();
    if (claimed.length === 0) throw new ListingUnavailableError("Cette annonce vient d'être vendue");

    const debited = await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} - ${price}` })
      .where(and(eq(users.id, buyerId), sql`${users.walletBalance} >= ${price}`))
      .returning();
    if (debited.length === 0) throw new InsufficientFundsError('Solde insuffisant');

    // Same commission the admin plans/settings pages already configure —
    // reads happen outside `tx` since nothing written above needs to be
    // visible to them, and they only read, never write.
    const plan = await getCurrentPlanForVendor(vendor.id);
    const { commissionPercent } = await getEffectiveFees(plan);
    const commission = Math.round((price * commissionPercent) / 100);
    const vendorProceeds = price - commission;

    await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${vendorProceeds}` })
      .where(eq(users.id, vendor.userId));

    await tx.insert(transactions).values([
      {
        userId: buyerId,
        amount: price.toString(),
        type: 'PAYMENT',
        status: 'COMPLETED',
        gateway: 'WALLET',
        listingId,
        note: `Achat : ${listing.title}`,
      },
      {
        userId: vendor.userId,
        amount: vendorProceeds.toString(),
        type: 'DEPOSIT',
        status: 'COMPLETED',
        gateway: 'WALLET',
        listingId,
        note: `Vente : ${listing.title}`,
      },
    ]);

    return { price, vendorProceeds, commission };
  });
}
