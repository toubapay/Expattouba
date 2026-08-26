import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { uid: string, email?: string, phone?: string };
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret-senemarket-key-2026';

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
  try {
    // If token is a short custom JWT (Firebase tokens are usually very long > 800 chars)
    if (token.split('.').length === 3 && token.length < 500) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = { uid: decoded.uid, phone: decoded.phone };
      return next();
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

