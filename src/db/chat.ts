import { db } from './index.ts';
import { chatMessages, chatThreads, listings, vendors } from './schema.ts';
import { and, asc, desc, eq } from 'drizzle-orm';

/** One thread per (listing, buyer) — a repeat visit to the same listing
 * reopens the same conversation instead of starting a new one.
 *
 * Insert-first with onConflictDoNothing, not select-then-insert: two
 * concurrent calls for the same pair (e.g. React StrictMode's double effect
 * invocation in dev, or just a fast double-tap) must not race past a
 * "does it exist?" check that's already stale by the time either one
 * inserts. The unique index on (listing_id, buyer_uid) is what makes this
 * safe — one insert wins, the other falls through to the select below. */
export async function getOrCreateThread(listingId: string, buyerUid: string) {
  const listing = (await db.select().from(listings).where(eq(listings.id, listingId)).limit(1))[0];
  if (!listing) throw new Error('Listing not found');

  const inserted = await db
    .insert(chatThreads)
    .values({ listingId, vendorId: listing.vendorId, buyerUid })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  const existing = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.listingId, listingId), eq(chatThreads.buyerUid, buyerUid)))
    .limit(1);
  return existing[0];
}

export async function getThread(threadId: string) {
  const rows = await db.select().from(chatThreads).where(eq(chatThreads.id, threadId)).limit(1);
  return rows[0] ?? null;
}

/** Threads a given uid can see: as the buyer, or as the vendor behind them. */
export async function listThreadsForUid(uid: string, vendorId: string | null) {
  const rows = await db
    .select({
      thread: chatThreads,
      listingTitle: listings.title,
      listingImage: listings.image,
      vendorName: vendors.boutiqueName,
    })
    .from(chatThreads)
    .innerJoin(listings, eq(chatThreads.listingId, listings.id))
    .innerJoin(vendors, eq(chatThreads.vendorId, vendors.id))
    .orderBy(desc(chatThreads.createdAt));

  return rows.filter((r) => r.thread.buyerUid === uid || (vendorId && r.thread.vendorId === vendorId));
}

export async function listMessages(threadId: string) {
  return db.select().from(chatMessages).where(eq(chatMessages.threadId, threadId)).orderBy(asc(chatMessages.createdAt));
}

export async function postMessage(threadId: string, senderUid: string, body: string) {
  const result = await db.insert(chatMessages).values({ threadId, senderUid, body }).returning();
  return result[0];
}
