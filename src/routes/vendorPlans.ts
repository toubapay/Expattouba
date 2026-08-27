import { Router } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getVendorIdForUid } from '../db/users.ts';
import { getPlan } from '../db/vendorPlans.ts';
import { createOrder, getOrder, markOrderFailed, completeOrderAndActivate } from '../db/planOrders.ts';
import { createInvoice, confirmInvoice, isPaydunyaConfigured, PaydunyaNotConfiguredError } from '../lib/paydunya.ts';

export const vendorPlansRouter = Router();

vendorPlansRouter.use(requireAuth);

function appUrl(req: AuthRequest): string {
  const configured = process.env.APP_URL;
  const base = configured || `${req.protocol}://${req.get('host')}`;
  return base.replace(/\/$/, '');
}

// A vendor starts a Paydunya checkout for a plan. The order row is created
// only after the invoice itself is created — its id is generated here
// (not left to the DB default) so it can go in Paydunya's return_url
// before the row exists, letting the frontend land back on a URL that
// already names which order to sync.
vendorPlansRouter.post('/:planId/checkout', async (req: AuthRequest, res) => {
  try {
    const vendorId = await getVendorIdForUid(req.user!.uid);
    if (!vendorId) return res.status(403).json({ error: 'Réservé aux vendeurs' });

    const plan = await getPlan(req.params.planId);
    if (!plan || !plan.active) return res.status(404).json({ error: 'Offre introuvable' });
    if (plan.priceFcfa <= 0) {
      return res.status(400).json({ error: 'Cette offre est gratuite — aucun paiement nécessaire.' });
    }
    if (!isPaydunyaConfigured()) {
      return res.status(503).json({ error: "Le paiement en ligne n'est pas disponible pour le moment." });
    }

    const base = appUrl(req);
    const orderId = randomUUID();

    const invoice = await createInvoice({
      amountFcfa: plan.priceFcfa,
      description: `Offre ${plan.name} — SeneMarket`,
      returnUrl: `${base}/?vendorPlanOrder=${orderId}`,
      cancelUrl: `${base}/?vendorPlanOrder=${orderId}&cancelled=1`,
      callbackUrl: `${base}/api/payments/paydunya/ipn`,
      customData: { orderId },
    });

    await createOrder(orderId, vendorId, plan.id, invoice.token, plan.priceFcfa);
    res.json({ orderId, checkoutUrl: invoice.checkoutUrl });
  } catch (error: any) {
    if (error instanceof PaydunyaNotConfiguredError) {
      return res.status(503).json({ error: error.message });
    }
    console.error('Paydunya checkout error:', error);
    res.status(500).json({ error: error.message || 'Échec du paiement' });
  }
});

// Called by the frontend right after the browser lands back from
// Paydunya's checkout page (the return_url). This is the primary
// confirmation path in practice — the IPN is a bonus in an environment
// that can actually receive one, but a hosted checkout redirect back to
// the app is guaranteed, so this can't be skipped in favor of the IPN
// alone.
vendorPlansRouter.post('/orders/:id/sync', async (req: AuthRequest, res) => {
  try {
    const vendorId = await getVendorIdForUid(req.user!.uid);
    const order = await getOrder(req.params.id);
    if (!order || order.vendorId !== vendorId) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.status !== 'PENDING') return res.json({ status: order.status });

    const confirmed = await confirmInvoice(order.invoiceToken);
    if (confirmed.status === 'completed') {
      const result = await completeOrderAndActivate(order.id);
      return res.json({ status: 'COMPLETED', activated: !!result });
    }
    if (confirmed.status === 'cancelled') {
      await markOrderFailed(order.id);
      return res.json({ status: 'CANCELLED' });
    }
    res.json({ status: 'PENDING' });
  } catch (error: any) {
    if (error instanceof PaydunyaNotConfiguredError) {
      return res.status(503).json({ error: error.message });
    }
    console.error('Paydunya sync error:', error);
    res.status(500).json({ error: error.message || 'Échec de vérification du paiement' });
  }
});
