import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { payOrder, PaymentError } from './payments.service.js';
import { payOrderSchema, paymentOrderIdSchema } from './payments.schema.js';

const messages = {
  ORDER_NOT_FOUND: 'Commande introuvable.',
  ORDER_ALREADY_PAID: 'Cette commande est déjà payée avec une autre référence.',
  PAYMENT_REFERENCE_CONFLICT: 'Cette référence de paiement est déjà utilisée.',
  INSUFFICIENT_STOCK: 'Stock insuffisant au moment du paiement.',
} as const;

export async function payOrderHandler(req: Request, res: Response): Promise<void> {
  try {
    const orderId = paymentOrderIdSchema.parse(req.params.id);
    const input = payOrderSchema.parse(req.body);
    res.json(await payOrder(orderId, input));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: { code: 'INVALID_PAYMENT', message: 'Données de paiement invalides.', details: error.issues } });
      return;
    }
    if (error instanceof PaymentError) {
      res.status(error.code === 'ORDER_NOT_FOUND' ? 404 : 409).json({
        error: { code: error.code, message: messages[error.code] },
      });
      return;
    }
    throw error;
  }
}
