import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getUserWithVendor } from '../db/users.ts';
import {
  listTransactionsForUser,
  purchaseListing,
  InsufficientFundsError,
  ListingUnavailableError,
  OwnListingError,
} from '../db/wallet.ts';

export const walletRouter = Router();

walletRouter.use(requireAuth);

walletRouter.get('/transactions', async (req: AuthRequest, res) => {
  try {
    const user = await getUserWithVendor(req.user!.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(await listTransactionsForUser(user.id));
  } catch (error) {
    console.error('List transactions error:', error);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

walletRouter.post('/purchase', async (req: AuthRequest, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId requis' });

    const user = await getUserWithVendor(req.user!.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await purchaseListing(user.id, listingId);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    if (error instanceof InsufficientFundsError || error instanceof OwnListingError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof ListingUnavailableError) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Failed to complete purchase' });
  }
});
