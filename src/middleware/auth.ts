import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { JWT_SECRET } from '../lib/jwt.ts';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { uid: string, email?: string, phone?: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Verify as our own custom JWT first — this checks the signature, not a
  // guess based on token length, so it can't be confused with (or used to
  // bypass) Firebase ID token verification. Only on failure does this fall
  // through to Firebase, which is the actual signal that it's a different
  // kind of token.
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { uid: decoded.uid, phone: decoded.phone };
    return next();
  } catch {
    // Not one of our tokens — fall through to Firebase verification below.
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

