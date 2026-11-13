import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { pool } from './database/pool.js';
import { openApiDocument } from './openapi.js';
import { productsRouter } from './modules/products/index.js';
import { ordersRouter } from './modules/orders/index.js';
import { paymentsRouter } from './modules/payments/index.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Base de données indisponible.' } });
  }
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/orders', paymentsRouter);
app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route introuvable.' } });
});
