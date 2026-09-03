import { db } from './index.ts';
import { listings, vendors } from './schema.ts';
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { getCurrentPlanForVendor } from './vendorSubscriptions.ts';

export interface FeedListing {
  id: string;
  title: string;
  price: string;
  description: string | null;
  image: string | null;
  currency: string | null;
  whatsapp: string | null;
  category: string | null;
  city: string | null;
  attributes: Record<string, string | number> | null;
  vendorId: string;
  vendorName: string;
  vendorBadge: string | null;
  featured: boolean;
  priorityRank: number;
}

export interface ListingFilters {
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
}

async function withFeaturedFlag(rows: Omit<FeedListing, 'featured' | 'priorityRank'>[]): Promise<FeedListing[]> {
  // One current-plan lookup per distinct vendor in the page, not per row —
  // a feed of many listings from the same shop shouldn't repeat the query.
  const planByVendor = new Map<string, { featured: boolean; priorityRank: number }>();
  for (const row of rows) {
    if (planByVendor.has(row.vendorId)) continue;
    const plan = await getCurrentPlanForVendor(row.vendorId);
    planByVendor.set(row.vendorId, {
      featured: plan?.featuredHome ?? false,
      priorityRank: plan?.priorityRank ?? 100,
    });
  }
  return rows.map((row) => ({ ...row, ...(planByVendor.get(row.vendorId) ?? { featured: false, priorityRank: 100 }) }));
}

/** Everything the home screen needs from the catalogue: an active listing
 * feed, each row tagged with whether its vendor's current plan puts it in
 * the featured rail — derived at read time, same reasoning as the sister
 * app's discount badge: a plan that lapses must stop featuring the listing
 * on the very next fetch, not whenever something remembers to unset a flag. */
export async function getHomeFeed(filters: ListingFilters = {}): Promise<{ featured: FeedListing[]; listings: FeedListing[] }> {
  const { category, city, minPrice, maxPrice, q } = filters;
  const conditions = [eq(listings.status, 'ACTIVE')];
  if (category) conditions.push(eq(listings.category, category));
  if (city) conditions.push(eq(listings.city, city));
  if (minPrice != null) conditions.push(gte(listings.price, minPrice.toString()));
  if (maxPrice != null) conditions.push(lte(listings.price, maxPrice.toString()));
  if (q) conditions.push(or(ilike(listings.title, `%${q}%`), ilike(listings.description, `%${q}%`))!);

  const rows = await db
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
    .from(listings)
    .innerJoin(vendors, eq(listings.vendorId, vendors.id))
    .where(and(...conditions))
    .orderBy(desc(listings.createdAt));

  const enriched = await withFeaturedFlag(rows);
  enriched.sort((a, b) => a.priorityRank - b.priorityRank || 0);
  const featured = enriched.filter((l) => l.featured);
  return { featured, listings: enriched };
}

export async function countActiveListingsForVendor(vendorId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.vendorId, vendorId), eq(listings.status, 'ACTIVE')));
  return result[0]?.count ?? 0;
}

export class ListingLimitError extends Error {
  constructor(public limit: number) {
    super(`Limite de ${limit} annonces actives atteinte pour votre offre`);
  }
}

export async function createListingForVendor(data: {
  vendorId: string;
  title: string;
  description: string;
  price: string;
  image: string;
  whatsapp: string | null;
  category: string | null;
  city: string | null;
  attributes: Record<string, string | number> | null;
}) {
  const plan = await getCurrentPlanForVendor(data.vendorId);
  if (plan?.maxListings != null) {
    const current = await countActiveListingsForVendor(data.vendorId);
    if (current >= plan.maxListings) {
      throw new ListingLimitError(plan.maxListings);
    }
  }
  const result = await db.insert(listings).values(data).returning();
  return result[0];
}
