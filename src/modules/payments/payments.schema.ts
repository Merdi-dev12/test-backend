import { z } from 'zod';

export const payOrderSchema = z.strictObject({
  paymentReference: z.string().trim().min(1).max(200),
});

export const paymentOrderIdSchema = z.uuid();
export type PayOrderInput = z.infer<typeof payOrderSchema>;
