import { Router } from 'express';
import { createProductHandler, listProductsHandler } from './products.controller.js';
import { requireAdmin } from '../../shared/admin-access.js';

export const productsRouter = Router();
productsRouter.post('/', requireAdmin, createProductHandler);
productsRouter.get('/', listProductsHandler);
