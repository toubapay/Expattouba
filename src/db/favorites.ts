import { db } from './index.ts';
import { favorites, listings, vendors } from './schema.ts';
import { and, desc, eq } from 'drizzle-orm';
import type { FeedListing } from './listings.ts';

/** Idempotent — favoriting an already-favorited listing is a no-op, not an
 * error, thanks to the (userId, listingId) unique index (see schema.ts).
 * Two rapid taps on the heart icon (a slow network, a double-click) can't
 * produce a duplicate row for a race to trip over later. */
export async function addFavorite(userId: string, listingId: string) {
  await db.insert(favorites).values({ userId, listingId }).onConflictDoNothing();
}

export async function removeFavorite(userId: string, listingId: string) {
  await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
}

/** Just the ids — cheap enough to load on every login so the heart icon
 * everywhere (home feed, product detail) knows its state without a
 * separate lookup per listing. */
export async function listFavoriteIds(userId: string): Promise<string[]> {
  const rows = await db.select({ listingId: favorites.listingId }).from(favorites).where(eq(favorites.userId, userId));
  return rows.map((r) => r.listingId);
}

/** Full listing details for the "Mes favoris" screen — same row shape as
 * getHomeFeed's FeedListing (minus featured/priorityRank, which are about
 * home-page placement, not relevant to a saved-listings list) so the
 * frontend can reuse the same listing card component either place. */
export async function listFavoritesForUser(userId: string): Promise<Omit<FeedListing, 'featured' | 'priorityRank'>[]> {
  return db
    .select({
      id: listings.id,
      title: listings.title,
      price: listings.price,
      description: listings.description,
      image: listings.image,
      currency: listings.currency,
      whatsapp: listings.whatsapp,
      category: listings.category,
      city: listings.city,
      attributes: listings.attributes,
      vendorId: vendors.id,
      vendorName: vendors.boutiqueName,
      vendorBadge: vendors.badgeStatus,
    })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .innerJoin(vendors, eq(listings.vendorId, vendors.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
}
