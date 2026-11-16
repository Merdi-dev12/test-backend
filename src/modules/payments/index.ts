import { Router } from 'express';
import { depositCallbackHandler, getPaymentHandler, initiatePaymentHandler } from './payments.controller.js';

export const paymentsRouter = Router();
paymentsRouter.post('/:id/payments', initiatePaymentHandler);
paymentsRouter.get('/:id/payments', getPaymentHandler);

export const paymentWebhooksRouter = Router();
paymentWebhooksRouter.post('/pawapay/deposits', depositCallbackHandler);
