import { z } from 'zod';

const providerPrefixes = {
  VODACOM_MPESA_COD: ['81', '82', '83', '86'],
  AIRTEL_COD: ['97', '98', '99'],
  ORANGE_COD: ['80', '84', '85', '89'],
} as const;

export const initiatePaymentSchema = z.strictObject({
  provider: z.enum(['VODACOM_MPESA_COD', 'AIRTEL_COD', 'ORANGE_COD']),
  phoneNumber: z.string().regex(/^243\d{9}$/),
}).superRefine(({ provider, phoneNumber }, context) => {
  if (!/^243\d{9}$/.test(phoneNumber)) return;
  if (!providerPrefixes[provider].some((prefix) => phoneNumber.startsWith(`243${prefix}`))) {
    context.addIssue({
      code: 'custom', path: ['phoneNumber'],
      message: 'Le préfixe du numéro ne correspond pas à l’opérateur choisi.',
    });
  }
});

export const paymentOrderIdSchema = z.uuid();
export const depositIdSchema = z.uuid();
export const callbackSchema = z.object({ depositId: depositIdSchema });
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
