import { Router } from 'express';
import { eq, sql, ilike, or, desc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users, vendors, listings, vendorSubscriptions } from '../db/schema.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { requireAdmin } from '../middleware/requireAdmin.ts';
import { getSettings, setSetting, AppSettings } from '../db/settings.ts';
import {
  listAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../db/categories.ts';
import { listPlans, getPlan, createPlan, updatePlan, deactivatePlan, PlanInput } from '../db/vendorPlans.ts';
import { listAllSubscriptions, assignPlan, cancelSubscription } from '../db/vendorSubscriptions.ts';
import { adjustWalletForUser, InsufficientFundsError } from '../db/wallet.ts';

export const adminRouter = Router();

// Every route below is staff-only: a real login (requireAuth) plus the
// isAdmin flag (requireAdmin), chained in that order like the sister app's
// requireUser/requireAdmin split.
adminRouter.use(requireAuth, requireAdmin);

// ---- Dashboard -------------------------------------------------------

adminRouter.get('/stats', async (_req, res) => {
  try {
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [vendorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(vendors);
    const [listingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(listings);
    const [activeListingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(eq(listings.status, 'ACTIVE'));
    const [activeSubCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendorSubscriptions)
      .where(eq(vendorSubscriptions.status, 'ACTIVE'));
    const [revenue] = await db
      .select({ total: sql<number>`coalesce(sum(price_paid_fcfa), 0)::int` })
      .from(vendorSubscriptions);

    res.json({
      users: userCount.count,
      vendors: vendorCount.count,
      listings: listingCount.count,
      activeListings: activeListingCount.count,
      activeSubscriptions: activeSubCount.count,
      totalRevenueFcfa: revenue.total,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ---- Users -------------------------------------------------------

adminRouter.get('/users', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const query = db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        phoneNumber: users.phoneNumber,
        walletBalance: users.walletBalance,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        vendorId: vendors.id,
        boutiqueName: vendors.boutiqueName,
        whatsappNumber: vendors.whatsappNumber,
        badgeStatus: vendors.badgeStatus,
        isVerified: vendors.isVerified,
      })
      .from(users)
      .leftJoin(vendors, eq(vendors.userId, users.id))
      .orderBy(desc(users.createdAt));

    const rows = search
      ? await query.where(
          or(
            ilike(users.email, `%${search}%`),
            ilike(users.phoneNumber, `%${search}%`),
            ilike(vendors.boutiqueName, `%${search}%`)
          )
        )
      : await query;

    res.json(rows);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

adminRouter.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { isAdmin, isVerified, badgeStatus } = req.body;

    if (typeof isAdmin === 'boolean') {
      if (isAdmin === false) {
        const self = await db.select({ id: users.id }).from(users).where(eq(users.uid, req.user!.uid)).limit(1);
        if (self[0]?.id === id) {
          return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres droits admin' });
        }
      }
      await db.update(users).set({ isAdmin }).where(eq(users.id, id));
    }
    if (typeof isVerified === 'boolean' || typeof badgeStatus === 'string') {
      const patch: Record<string, unknown> = {};
      if (typeof isVerified === 'boolean') patch.isVerified = isVerified;
      if (typeof badgeStatus === 'string') patch.badgeStatus = badgeStatus;
      await db.update(vendors).set(patch).where(eq(vendors.userId, id));
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Manual credit/debit — the only way real money enters or leaves a wallet
// here, same reasoning as the sister app: there's no payment gateway
// wired up, so pretending "Recharger" works in the customer app would be
// fabricating something that looks real but isn't.
adminRouter.post('/users/:id/wallet-adjust', async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const note = String(req.body.note || '').trim() || 'Ajustement admin';
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    const updated = await adjustWalletForUser(req.params.id, Math.round(amount), note);
    res.json(updated);
  } catch (error: any) {
    if (error instanceof InsufficientFundsError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Admin wallet adjust error:', error);
    res.status(500).json({ error: 'Failed to adjust wallet' });
  }
});

// ---- Settings (global commission/fee defaults, home page copy) ----

adminRouter.get('/settings', async (_req, res) => {
  try {
    res.json(await getSettings());
  } catch (error) {
    console.error('Admin get settings error:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

adminRouter.patch('/settings', async (req, res) => {
  try {
    const body = req.body as Partial<AppSettings>;
    if (body.defaultCommissionPercent !== undefined) {
      await setSetting('defaultCommissionPercent', Number(body.defaultCommissionPercent));
    }
    if (body.defaultFeeFcfa !== undefined) {
      await setSetting('defaultFeeFcfa', Number(body.defaultFeeFcfa));
    }
    if (body.walletPurchaseEnabled !== undefined) {
      await setSetting('walletPurchaseEnabled', !!body.walletPurchaseEnabled);
    }
    if (body.home !== undefined) {
      const current = await getSettings();
      await setSetting('home', { ...current.home, ...body.home });
    }
    res.json(await getSettings());
  } catch (error) {
    console.error('Admin update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ---- Categories -------------------------------------------------------

adminRouter.get('/categories', async (_req, res) => {
  res.json(await listAllCategories());
});

adminRouter.post('/categories', async (req, res) => {
  try {
    const { name, icon, sortOrder, fieldSet } = req.body;
    if (!name) return res.status(400).json({ error: 'name requis' });
    res.json(await createCategory({ name, icon, sortOrder, fieldSet: fieldSet || null }));
  } catch (error) {
    console.error('Admin create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

adminRouter.patch('/categories/:id', async (req, res) => {
  try {
    const updated = await updateCategory(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (error) {
    console.error('Admin update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

adminRouter.delete('/categories/:id', async (req, res) => {
  await deleteCategory(req.params.id);
  res.json({ ok: true });
});

// ---- Vendor plans (segmentation & pricing) -------------------------------------------------------

adminRouter.get('/plans', async (_req, res) => {
  res.json(await listPlans());
});

adminRouter.post('/plans', async (req, res) => {
  try {
    const input = normalizePlanInput(req.body);
    if (!input) return res.status(400).json({ error: 'Champs de plan invalides' });
    res.json(await createPlan(input));
  } catch (error) {
    console.error('Admin create plan error:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

adminRouter.patch('/plans/:id', async (req, res) => {
  try {
    const existing = await getPlan(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const merged = normalizePlanInput({ ...existing, ...req.body });
    if (!merged) return res.status(400).json({ error: 'Champs de plan invalides' });
    res.json(await updatePlan(req.params.id, merged));
  } catch (error) {
    console.error('Admin update plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

adminRouter.delete('/plans/:id', async (req, res) => {
  const updated = await deactivatePlan(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

function normalizePlanInput(body: any): PlanInput | null {
  const priceFcfa = Number(body.priceFcfa);
  const durationDays = Number(body.durationDays);
  if (!body.name || !Number.isFinite(priceFcfa) || priceFcfa < 0 || !Number.isFinite(durationDays) || durationDays <= 0) {
    return null;
  }
  return {
    name: String(body.name),
    priceFcfa,
    durationDays,
    maxListings: body.maxListings === null || body.maxListings === '' || body.maxListings === undefined
      ? null
      : Number(body.maxListings),
    featuredHome: !!body.featuredHome,
    priorityRank: Number.isFinite(Number(body.priorityRank)) ? Number(body.priorityRank) : 100,
    commissionPercent:
      body.commissionPercent === null || body.commissionPercent === '' || body.commissionPercent === undefined
        ? null
        : Number(body.commissionPercent),
    feeFcfa: body.feeFcfa === null || body.feeFcfa === '' || body.feeFcfa === undefined ? null : Number(body.feeFcfa),
    active: body.active === undefined ? true : !!body.active,
  };
}

// ---- Vendors & subscriptions -------------------------------------------------------

adminRouter.get('/vendors', async (req, res) => {
  const search = String(req.query.search || '').trim();
  const query = db
    .select({
      id: vendors.id,
      boutiqueName: vendors.boutiqueName,
      whatsappNumber: vendors.whatsappNumber,
      badgeStatus: vendors.badgeStatus,
      isVerified: vendors.isVerified,
    })
    .from(vendors)
    .orderBy(desc(vendors.createdAt));

  const rows = search ? await query.where(ilike(vendors.boutiqueName, `%${search}%`)) : await query;
  res.json(rows);
});

adminRouter.get('/subscriptions', async (_req, res) => {
  res.json(await listAllSubscriptions());
});

adminRouter.post('/subscriptions', async (req, res) => {
  try {
    const { vendorId, planId } = req.body;
    if (!vendorId || !planId) return res.status(400).json({ error: 'vendorId et planId requis' });
    res.json(await assignPlan(vendorId, planId));
  } catch (error: any) {
    console.error('Admin assign plan error:', error);
    res.status(400).json({ error: error.message || 'Failed to assign plan' });
  }
});

adminRouter.post('/subscriptions/:id/cancel', async (req, res) => {
  const updated = await cancelSubscription(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});
