import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { createProduct, listProducts } from './products.service.js';
import { createProductSchema, listProductsSchema } from './products.schema.js';

export async function createProductHandler(req: Request, res: Response): Promise<void> {
  try {
    const input = createProductSchema.parse(req.body);
    res.status(201).json(await createProduct(input));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: { code: 'INVALID_PRODUCT', message: 'Données du produit invalides.', details: error.issues } });
      return;
    }
    throw error;
  }
}

export async function listProductsHandler(req: Request, res: Response): Promise<void> {
  try {
    const input = listProductsSchema.parse(req.query);
    res.json(await listProducts(input));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: { code: 'INVALID_PAGINATION', message: 'Paramètres de pagination invalides.', details: error.issues } });
      return;
    }
    throw error;
  }
}
