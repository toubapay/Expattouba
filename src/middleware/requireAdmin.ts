import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

/** Chain after requireAuth, same as the sister app's requireAdmin/requireUser
 * split — this only checks the isAdmin flag, it never authenticates on its
 * own. */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const rows = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.uid, uid)).limit(1);
  if (!rows[0]?.isAdmin) {
    return res.status(403).json({ error: 'Accès administrateur requis' });
  }
  next();
};
