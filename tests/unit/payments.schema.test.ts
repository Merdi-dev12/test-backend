import { describe, expect, it } from 'vitest';
import { callbackSchema, initiatePaymentSchema, paymentOrderIdSchema } from '../../src/modules/payments/payments.schema.js';

describe('payment schemas', () => {
  it('accepte un numéro RDC avec un fournisseur pris en charge', () => {
    expect(initiatePaymentSchema.parse({ provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' }))
      .toEqual({ provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' });
  });

  it.each([
    { provider: 'UNKNOWN', phoneNumber: '243813456789' },
    { provider: 'AIRTEL_COD', phoneNumber: '0813456789' },
    { provider: 'ORANGE_COD', phoneNumber: '243893456789', amount: 1 },
  ])('refuse une initiation invalide : %j', (input) => {
    expect(initiatePaymentSchema.safeParse(input).success).toBe(false);
  });

  it('valide les identifiants de commande et de callback', () => {
    expect(paymentOrderIdSchema.safeParse('invalid').success).toBe(false);
    expect(callbackSchema.safeParse({ depositId: 'invalid' }).success).toBe(false);
  });
});
