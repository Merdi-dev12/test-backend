import { Router } from 'express';
import { payOrderHandler } from './payments.controller.js';

export const paymentsRouter = Router();
paymentsRouter.post('/:id/payments', payOrderHandler);
