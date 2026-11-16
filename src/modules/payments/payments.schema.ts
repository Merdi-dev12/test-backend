import { z } from 'zod';

export const initiatePaymentSchema = z.strictObject({
  provider: z.enum(['VODACOM_MPESA_COD', 'AIRTEL_COD', 'ORANGE_COD']),
  phoneNumber: z.string().regex(/^243\d{9}$/),
});

export const paymentOrderIdSchema = z.uuid();
export const depositIdSchema = z.uuid();
export const callbackSchema = z.object({ depositId: depositIdSchema });
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
