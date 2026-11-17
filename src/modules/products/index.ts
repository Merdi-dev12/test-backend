import { Router } from 'express';
import { createProductHandler, listProductsHandler } from './products.controller.js';

export const productsRouter = Router();
productsRouter.post('/', createProductHandler);
productsRouter.get('/', listProductsHandler);
