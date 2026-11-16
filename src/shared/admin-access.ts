import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!env.ADMIN_API_KEY && env.NODE_ENV !== 'production') return next();
  const supplied = req.header('x-admin-key') ?? '';
  const expected = env.ADMIN_API_KEY ?? '';
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Clé administrateur invalide.' } });
    return;
  }
  next();
};
