import { describe, expect, it } from 'vitest';
import { callbackSchema, initiatePaymentSchema, paymentOrderIdSchema } from '../../src/modules/payments/payments.schema.js';

describe('payment schemas', () => {
  it('accepte un numéro RDC avec un fournisseur pris en charge', () => {
    expect(initiatePaymentSchema.parse({ provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' }))
      .toEqual({ provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' });
  });

  it.each([
    ['VODACOM_MPESA_COD', '243813456789'],
    ['VODACOM_MPESA_COD', '243823456789'],
    ['VODACOM_MPESA_COD', '243833456789'],
    ['VODACOM_MPESA_COD', '243863456789'],
    ['AIRTEL_COD', '243973456789'],
    ['AIRTEL_COD', '243983456789'],
    ['AIRTEL_COD', '243993456789'],
    ['ORANGE_COD', '243803456789'],
    ['ORANGE_COD', '243843456789'],
    ['ORANGE_COD', '243853456789'],
    ['ORANGE_COD', '243893456789'],
  ] as const)('accepte le préfixe %s / %s', (provider, phoneNumber) => {
    expect(initiatePaymentSchema.safeParse({ provider, phoneNumber }).success).toBe(true);
  });

  it.each([
    { provider: 'UNKNOWN', phoneNumber: '243813456789' },
    { provider: 'AIRTEL_COD', phoneNumber: '0813456789' },
    { provider: 'AIRTEL_COD', phoneNumber: '243963456789' },
    { provider: 'ORANGE_COD', phoneNumber: '243893456789', amount: 1 },
    { provider: 'ORANGE_COD', phoneNumber: '243813456789' },
    { provider: 'VODACOM_MPESA_COD', phoneNumber: '243973456789' },
    { provider: 'AIRTEL_COD', phoneNumber: '243893456789' },
  ])('refuse une initiation invalide : %j', (input) => {
    expect(initiatePaymentSchema.safeParse(input).success).toBe(false);
  });

  it('valide les identifiants de commande et de callback', () => {
    expect(paymentOrderIdSchema.safeParse('invalid').success).toBe(false);
    expect(callbackSchema.safeParse({ depositId: 'invalid' }).success).toBe(false);
  });
});
