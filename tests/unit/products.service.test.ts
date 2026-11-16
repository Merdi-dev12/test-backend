import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/products/products.repository.js', () => ({
  insertProduct: vi.fn(),
  findProducts: vi.fn(async () => ({ items: [], total: 41 })),
}));

import { listProducts } from '../../src/modules/products/products.service.js';

describe('listProducts', () => {
  it('calcule le nombre de pages à partir du total', async () => {
    expect(await listProducts({ page: 2, limit: 20 })).toEqual({
      items: [], page: 2, limit: 20, total: 41, totalPages: 3,
    });
  });
});
