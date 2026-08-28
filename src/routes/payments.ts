import { Router } from 'express';
import express from 'express';
import { listPlans } from '../db/vendorPlans.ts';
import { getOrderByToken, completeOrderAndActivate } from '../db/planOrders.ts';
import { confirmInvoice, extractTokenFromIpnBody, isPaydunyaConfigured } from '../lib/paydunya.ts';

export const paymentsRouter = Router();

// Public — a vendor picking a plan to buy needs to see prices before
// logging in to check out. Commission/feeFcfa are stripped: that's the
// platform's margin, not something an unauthenticated endpoint should
// publish (same reasoning as publicService() in the sister app, and as
// getHomeFeed()'s handling of settings here).
paymentsRouter.get('/vendor-plans', async (_req, res) => {
  try {
    const plans = await listPlans({ activeOnly: true });
    res.json(plans.map(({ commissionPercent, feeFcfa, ...rest }) => rest));
  } catch (error) {
    console.error('List public plans error:', error);
    res.status(500).json({ error: 'Failed to list plans' });
  }
});

paymentsRouter.get('/paydunya-status', (_req, res) => {
  res.json({ enabled: isPaydunyaConfigured() });
});

// Paydunya calls this server-to-server. Deliberately public (no auth is
// possible here — Paydunya isn't a logged-in user) and deliberately does
// not trust anything in the body about payment status: it only uses the
// body to find which token to ask Paydunya about directly, then acts on
// that answer. See src/lib/paydunya.ts's file header for why the exact
// body shape below is a best-effort guess.
paymentsRouter.post(
  '/paydunya/ipn',
  express.urlencoded({ extended: true }),
  async (req, res) => {
    // Always 200 — Paydunya retries on non-2xx, and a retry storm over an
    // order we've already decided isn't ours (or already processed) helps
    // no one. Every branch below still gets logged for follow-up.
    try {
      let body: any = req.body;
      if (typeof body?.data === 'string') {
        try {
          body = { ...body, data: JSON.parse(body.data) };
        } catch {
          // Not JSON after all — extractTokenFromIpnBody just won't find
          // anything in `data`, and the plain-field fallbacks still apply.
        }
      }

      const token = extractTokenFromIpnBody(body);
      if (!token) {
        console.warn('Paydunya IPN: no invoice token found in body');
        return res.status(200).send('ok');
      }

      const confirmed = await confirmInvoice(token);
      if (confirmed.status !== 'completed') {
        return res.status(200).send('ok');
      }

      const order = await getOrderByToken(token);
      if (!order) {
        console.warn('Paydunya IPN: confirmed token matches no known order', token);
        return res.status(200).send('ok');
      }

      await completeOrderAndActivate(order.id);
      res.status(200).send('ok');
    } catch (error) {
      console.error('Paydunya IPN error:', error);
      res.status(200).send('ok');
    }
  }
);
