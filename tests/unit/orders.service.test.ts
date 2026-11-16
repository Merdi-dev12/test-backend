import { describe, expect, it, vi } from 'vitest';

const { insertOrder, productExists, findOrder } = vi.hoisted(() => ({
  insertOrder: vi.fn(),
  productExists: vi.fn(),
  findOrder: vi.fn(),
}));

vi.mock('../../src/modules/orders/orders.repository.js', () => ({ insertOrder, productExists, findOrder }));

import { createOrder, getOrder, OrderError } from '../../src/modules/orders/orders.service.js';

const productId = '6f25f66a-419b-4e27-a8da-0f8d3f84e2b4';

describe('order service', () => {
  it('distingue un produit absent du stock insuffisant', async () => {
    insertOrder.mockResolvedValue(null);
    productExists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(createOrder({ productId, quantity: 2 })).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND' });
    await expect(createOrder({ productId, quantity: 2 })).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  it('signale une commande absente', async () => {
    findOrder.mockResolvedValue(null);
    await expect(getOrder(productId)).rejects.toBeInstanceOf(OrderError);
    await expect(getOrder(productId)).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });
});
