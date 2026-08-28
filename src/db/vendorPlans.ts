import { db } from './index.ts';
import { vendorPlans } from './schema.ts';
import { asc, eq } from 'drizzle-orm';

// A vendor with no active subscription still needs somewhere to land, so a
// free tier is seeded once — 3 active listings, no featured placement — the
// same way seedCategories() seeds the category rail. Not a fabricated
// benefit: it's the plan an admin would otherwise have to create by hand
// before the first vendor could post anything.
const FREE_PLAN_NAME = 'Gratuit';

export async function seedVendorPlans() {
  const existing = await db.select({ id: vendorPlans.id }).from(vendorPlans).limit(1);
  if (existing.length > 0) return;
  await db.insert(vendorPlans).values([
    {
      name: FREE_PLAN_NAME,
      priceFcfa: 0,
      durationDays: 36500, // effectively permanent; admins can still edit/retire it
      maxListings: 3,
      featuredHome: false,
      priorityRank: 100,
      commissionPercent: null,
      feeFcfa: null,
    },
    {
      name: 'Pro',
      priceFcfa: 5000,
      durationDays: 30,
      maxListings: 30,
      featuredHome: false,
      priorityRank: 10,
      commissionPercent: null,
      feeFcfa: null,
    },
    {
      name: 'Premium',
      priceFcfa: 15000,
      durationDays: 30,
      maxListings: null,
      featuredHome: true,
      priorityRank: 0,
      commissionPercent: null,
      feeFcfa: null,
    },
  ]);
}

export async function getFreePlan() {
  const rows = await db.select().from(vendorPlans).where(eq(vendorPlans.name, FREE_PLAN_NAME)).limit(1);
  return rows[0] ?? null;
}

export async function listPlans({ activeOnly = false }: { activeOnly?: boolean } = {}) {
  const query = db.select().from(vendorPlans).orderBy(asc(vendorPlans.priorityRank));
  if (!activeOnly) return query;
  return db.select().from(vendorPlans).where(eq(vendorPlans.active, true)).orderBy(asc(vendorPlans.priorityRank));
}

export async function getPlan(id: string) {
  const rows = await db.select().from(vendorPlans).where(eq(vendorPlans.id, id)).limit(1);
  return rows[0] ?? null;
}

export interface PlanInput {
  name: string;
  priceFcfa: number;
  durationDays: number;
  maxListings: number | null;
  featuredHome: boolean;
  priorityRank: number;
  commissionPercent: number | null;
  feeFcfa: number | null;
  active: boolean;
}

export async function createPlan(data: PlanInput) {
  const result = await db.insert(vendorPlans).values(data).returning();
  return result[0];
}

export async function updatePlan(id: string, data: Partial<PlanInput>) {
  const result = await db.update(vendorPlans).set(data).where(eq(vendorPlans.id, id)).returning();
  return result[0] ?? null;
}

/** Plans with subscription history are deactivated, not deleted — past
 * subscriptions and receipts still need to name the plan they bought. */
export async function deactivatePlan(id: string) {
  const result = await db.update(vendorPlans).set({ active: false }).where(eq(vendorPlans.id, id)).returning();
  return result[0] ?? null;
}
