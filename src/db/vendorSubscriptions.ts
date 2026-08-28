import { db } from './index.ts';
import { vendorPlans, vendorSubscriptions } from './schema.ts';
import { and, desc, eq, gt } from 'drizzle-orm';
import { getFreePlan } from './vendorPlans.ts';

/**
 * The plan governing a vendor right now: their latest ACTIVE subscription
 * that hasn't expired yet, or the free plan if they have none. Expiry is
 * checked here rather than by a background job flipping `status` — a cron
 * that hasn't run yet must never let an expired plan's benefits (featured
 * placement, a higher listing cap) keep applying.
 */
export async function getCurrentPlanForVendor(vendorId: string) {
  const rows = await db
    .select({ plan: vendorPlans, subscription: vendorSubscriptions })
    .from(vendorSubscriptions)
    .innerJoin(vendorPlans, eq(vendorSubscriptions.planId, vendorPlans.id))
    .where(
      and(
        eq(vendorSubscriptions.vendorId, vendorId),
        eq(vendorSubscriptions.status, 'ACTIVE'),
        gt(vendorSubscriptions.expiresAt, new Date())
      )
    )
    .orderBy(desc(vendorSubscriptions.expiresAt))
    .limit(1);

  if (rows.length > 0) return rows[0].plan;
  return getFreePlan();
}

export async function listSubscriptionsForVendor(vendorId: string) {
  return db
    .select({ subscription: vendorSubscriptions, plan: vendorPlans })
    .from(vendorSubscriptions)
    .innerJoin(vendorPlans, eq(vendorSubscriptions.planId, vendorPlans.id))
    .where(eq(vendorSubscriptions.vendorId, vendorId))
    .orderBy(desc(vendorSubscriptions.createdAt));
}

export async function listAllSubscriptions() {
  return db
    .select({ subscription: vendorSubscriptions, plan: vendorPlans })
    .from(vendorSubscriptions)
    .innerJoin(vendorPlans, eq(vendorSubscriptions.planId, vendorPlans.id))
    .orderBy(desc(vendorSubscriptions.createdAt));
}

/** Assigns a plan starting now, priced at the plan's *current* price —
 * snapshotted onto the row so a later price change can't rewrite what this
 * vendor actually paid.
 *
 * Takes an optional executor so a caller that already opened its own
 * db.transaction() (see planOrders.ts's completeOrderAndActivate) can pass
 * its `tx` through and get this insert in the *same* transaction, instead
 * of this function opening a second, independent one. */
type Executor = Pick<typeof db, 'select' | 'insert'>;

export async function assignPlan(vendorId: string, planId: string, executor: Executor = db) {
  const plan = (await executor.select().from(vendorPlans).where(eq(vendorPlans.id, planId)).limit(1))[0];
  if (!plan) throw new Error('Plan not found');

  const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
  const result = await executor
    .insert(vendorSubscriptions)
    .values({
      vendorId,
      planId,
      status: 'ACTIVE',
      expiresAt,
      pricePaidFcfa: plan.priceFcfa,
    })
    .returning();
  return result[0];
}

export async function cancelSubscription(id: string) {
  const result = await db
    .update(vendorSubscriptions)
    .set({ status: 'CANCELLED' })
    .where(eq(vendorSubscriptions.id, id))
    .returning();
  return result[0] ?? null;
}
