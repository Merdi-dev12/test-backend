import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { getOrderPayment, initiatePayment, PaymentError, refreshPayment } from './payments.service.js';
import { callbackSchema, initiatePaymentSchema, paymentOrderIdSchema } from './payments.schema.js';

function sendPaymentError(error: unknown, res: Response): boolean {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: 'INVALID_PAYMENT', message: 'Données de paiement invalides.', details: error.issues } });
    return true;
  }
  if (error instanceof PaymentError) {
    const status = error.code === 'PROVIDER_NOT_CONFIGURED' ? 503
      : error.code === 'ORDER_NOT_FOUND' || error.code === 'PAYMENT_NOT_FOUND' ? 404
        : error.code === 'PROVIDER_MISMATCH' ? 502 : 409;
    res.status(status).json({ error: { code: error.code, message: paymentMessages[error.code] } });
    return true;
  }
  return false;
}

const paymentMessages = {
  ORDER_NOT_FOUND: 'Commande introuvable.',
  ORDER_ALREADY_PAID: 'Cette commande est déjà payée.',
  PAYMENT_IN_PROGRESS: 'Un paiement est déjà en cours pour cette commande.',
  PAYMENT_NOT_FOUND: 'Tentative de paiement introuvable.',
  INSUFFICIENT_STOCK: 'Stock insuffisant pour réserver cette commande.',
  PROVIDER_NOT_CONFIGURED: 'La sandbox de paiement n’est pas configurée.',
  PROVIDER_MISMATCH: 'La confirmation du fournisseur ne correspond pas à la commande.',
} as const;

export async function initiatePaymentHandler(req: Request, res: Response): Promise<void> {
  try {
    const orderId = paymentOrderIdSchema.parse(req.params.id);
    const input = initiatePaymentSchema.parse(req.body);
    res.status(202).json(await initiatePayment(orderId, input));
  } catch (error) {
    if (!sendPaymentError(error, res)) throw error;
  }
}

export async function getPaymentHandler(req: Request, res: Response): Promise<void> {
  try {
    const orderId = paymentOrderIdSchema.parse(req.params.id);
    res.json(await getOrderPayment(orderId));
  } catch (error) {
    if (!sendPaymentError(error, res)) throw error;
  }
}

export async function depositCallbackHandler(req: Request, res: Response): Promise<void> {
  try {
    const { depositId } = callbackSchema.parse(req.body);
    await refreshPayment(depositId);
    res.status(200).json({ received: true });
  } catch (error) {
    if (error instanceof PaymentError && error.code === 'PAYMENT_NOT_FOUND') {
      res.status(200).json({ received: true });
      return;
    }
    if (!sendPaymentError(error, res)) throw error;
  }
}
