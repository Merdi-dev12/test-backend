import express, { type ErrorRequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import { env } from './config/env.js';
import { pool } from './database/pool.js';
import { openApiDocument } from './openapi.js';
import { productsRouter } from './modules/products/index.js';
import { ordersRouter } from './modules/orders/index.js';
import { paymentsRouter, paymentWebhooksRouter } from './modules/payments/index.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(cors({ origin: env.CORS_ORIGIN ?? false }));
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Base de données indisponible.' } });
  }
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
const paymentLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api/orders', paymentLimit);
app.use('/api/webhooks', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/orders', paymentsRouter);
app.use('/api/webhooks', paymentWebhooksRouter);
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route introuvable.' } });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Corps JSON invalide.' } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur.' } });
};
app.use(errorHandler);
