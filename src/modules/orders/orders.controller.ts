import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { createOrder, getOrder, OrderError } from './orders.service.js';
import { createOrderSchema, orderIdSchema } from './orders.schema.js';

const messages = {
  PRODUCT_NOT_FOUND: 'Produit introuvable.',
  INSUFFICIENT_STOCK: 'Stock insuffisant pour cette commande.',
  ORDER_NOT_FOUND: 'Commande introuvable.',
} as const;

function sendOrderError(error: OrderError, res: Response): void {
  const status = error.code === 'INSUFFICIENT_STOCK' ? 409 : 404;
  res.status(status).json({ error: { code: error.code, message: messages[error.code] } });
}

export async function createOrderHandler(req: Request, res: Response): Promise<void> {
  try {
    const input = createOrderSchema.parse(req.body);
    res.status(201).json(await createOrder(input));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: { code: 'INVALID_ORDER', message: 'Données de commande invalides.', details: error.issues } });
      return;
    }
    if (error instanceof OrderError) return sendOrderError(error, res);
    throw error;
  }
}

export async function getOrderHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = orderIdSchema.parse(req.params.id);
    res.json(await getOrder(id));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'Identifiant de commande invalide.' } });
      return;
    }
    if (error instanceof OrderError) return sendOrderError(error, res);
    throw error;
  }
}
