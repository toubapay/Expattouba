import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getUserWithVendor } from '../db/users.ts';
import { addFavorite, removeFavorite, listFavoriteIds, listFavoritesForUser } from '../db/favorites.ts';

export const favoritesRouter = Router();

favoritesRouter.use(requireAuth);

// Lightweight — just ids, loaded on login to drive the heart icon's state
// everywhere without a per-listing lookup. See src/db/favorites.ts.
favoritesRouter.get('/ids', async (req: AuthRequest, res) => {
  try {
    const user = await getUserWithVendor(req.user!.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(await listFavoriteIds(user.id));
  } catch (error) {
    console.error('List favorite ids error:', error);
    res.status(500).json({ error: 'Failed to list favorites' });
  }
});

favoritesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await getUserWithVendor(req.user!.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(await listFavoritesForUser(user.id));
  } catch (error) {
    console.error('List favorites error:', error);
    res.status(500).json({ error: 'Failed to list favorites' });
  }
});

favoritesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId requis' });
    const user = await getUserWithVendor(req.user!.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await addFavorite(user.id, listingId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

favoritesRouter.delete('/:listingId', async (req: AuthRequest, res) => {
  try {
    const user = await getUserWithVendor(req.user!.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await removeFavorite(user.id, req.params.listingId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});
