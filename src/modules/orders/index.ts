import { Router } from 'express';
import { createOrderHandler, getOrderHandler } from './orders.controller.js';

export const ordersRouter = Router();
ordersRouter.post('/', createOrderHandler);
ordersRouter.get('/:id', getOrderHandler);
