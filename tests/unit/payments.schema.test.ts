import { describe, expect, it } from 'vitest';
import { payOrderSchema, paymentOrderIdSchema } from '../../src/modules/payments/payments.schema.js';

describe('payment schemas', () => {
  it('accepte une référence et retire les espaces autour', () => {
    expect(payOrderSchema.parse({ paymentReference: ' ref-123 ' })).toEqual({ paymentReference: 'ref-123' });
  });

  it.each([{ paymentReference: '' }, { paymentReference: '   ' }, { paymentReference: 'x'.repeat(201) }, { paymentReference: 'ref', extra: true }])(
    'refuse une référence invalide : %j', (input) => {
      expect(payOrderSchema.safeParse(input).success).toBe(false);
    },
  );

  it('refuse un identifiant de commande mal formé', () => {
    expect(paymentOrderIdSchema.safeParse('invalid').success).toBe(false);
  });
});
