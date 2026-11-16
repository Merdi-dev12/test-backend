import { z } from 'zod';

export const createOrderSchema = z.strictObject({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(1_000_000),
});

export const orderIdSchema = z.uuid();
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
