import { describe, expect, it } from 'vitest';
import { createOrderSchema, orderIdSchema } from '../../src/modules/orders/orders.schema.js';

const productId = '6f25f66a-419b-4e27-a8da-0f8d3f84e2b4';

describe('order schemas', () => {
  it('accepte un produit et une quantité positive', () => {
    expect(createOrderSchema.parse({ productId, quantity: 2 })).toEqual({ productId, quantity: 2 });
    expect(orderIdSchema.parse(productId)).toBe(productId);
  });

  it.each([
    { productId: 'bad-id', quantity: 2 },
    { productId, quantity: 0 },
    { productId, quantity: -1 },
    { productId, quantity: 1.5 },
    { productId, quantity: 1_000_001 },
    { productId, quantity: 2, extra: true },
  ])('refuse une commande invalide : %j', (input) => {
    expect(createOrderSchema.safeParse(input).success).toBe(false);
  });
});
