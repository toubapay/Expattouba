import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getVendorIdForUid } from '../db/users.ts';
import { getOrCreateThread, getThread, listMessages, listThreadsForUid, postMessage } from '../db/chat.ts';

export const chatRouter = Router();

chatRouter.use(requireAuth);

/** True if this uid is allowed to see the thread: they're the buyer, or
 * they're the vendor being messaged. Checked on every read and write —
 * a thread id is guessable-ish (a uuid, but still no secret), so ownership
 * has to be enforced server-side rather than trusted from the URL. */
async function canAccessThread(threadId: string, uid: string) {
  const thread = await getThread(threadId);
  if (!thread) return null;
  if (thread.buyerUid === uid) return thread;
  const vendorId = await getVendorIdForUid(uid);
  if (vendorId && vendorId === thread.vendorId) return thread;
  return null;
}

chatRouter.post('/threads', async (req: AuthRequest, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId requis' });
    const thread = await getOrCreateThread(listingId, req.user!.uid);
    res.json(thread);
  } catch (error: any) {
    console.error('Create chat thread error:', error);
    res.status(400).json({ error: error.message || 'Failed to create thread' });
  }
});

chatRouter.get('/threads', async (req: AuthRequest, res) => {
  try {
    const vendorId = await getVendorIdForUid(req.user!.uid);
    const threads = await listThreadsForUid(req.user!.uid, vendorId);
    res.json(threads);
  } catch (error) {
    console.error('List chat threads error:', error);
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

chatRouter.get('/threads/:id/messages', async (req: AuthRequest, res) => {
  try {
    const thread = await canAccessThread(req.params.id, req.user!.uid);
    if (!thread) return res.status(404).json({ error: 'Not found' });
    res.json(await listMessages(thread.id));
  } catch (error) {
    console.error('List chat messages error:', error);
    res.status(500).json({ error: 'Failed to list messages' });
  }
});

chatRouter.post('/threads/:id/messages', async (req: AuthRequest, res) => {
  try {
    const thread = await canAccessThread(req.params.id, req.user!.uid);
    if (!thread) return res.status(404).json({ error: 'Not found' });
    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message vide' });
    if (body.length > 2000) return res.status(400).json({ error: 'Message trop long' });
    res.json(await postMessage(thread.id, req.user!.uid, body));
  } catch (error) {
    console.error('Post chat message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});
