import { z } from 'zod';

export const createProductSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  priceCdf: z.number().int().min(0).max(2_147_483_647),
  stock: z.number().int().min(0).max(2_147_483_647),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

const positiveQueryInteger = z.string().regex(/^[1-9]\d*$/).transform(Number);

export const listProductsSchema = z.strictObject({
  page: positiveQueryInteger.pipe(z.number().int().max(1_000_000)).prefault('1'),
  limit: positiveQueryInteger.pipe(z.number().int().max(100)).prefault('20'),
});

export type ListProductsInput = z.output<typeof listProductsSchema>;
