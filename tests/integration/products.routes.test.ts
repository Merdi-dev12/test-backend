import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { listProducts } = vi.hoisted(() => ({
  listProducts: vi.fn(async (_input: { page: number; limit: number }) => ({
    items: [], page: 2, limit: 5, total: 12, totalPages: 3,
  })),
}));

vi.mock('../../src/modules/products/products.service.js', () => ({
  createProduct: vi.fn(),
  listProducts,
}));

import { productsRouter } from '../../src/modules/products/index.js';

describe('products HTTP contract', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use('/api/products', productsRouter);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('transmet la page et la limite validées puis renvoie les métadonnées', async () => {
    const response = await fetch(`${baseUrl}/api/products?page=2&limit=5`);
    expect(response.status).toBe(200);
    expect(listProducts).toHaveBeenCalledWith({ page: 2, limit: 5 });
    expect(await response.json()).toEqual({ items: [], page: 2, limit: 5, total: 12, totalPages: 3 });
  });

  it('refuse une pagination invalide avant le service', async () => {
    listProducts.mockClear();
    const response = await fetch(`${baseUrl}/api/products?page=0`);
    expect(response.status).toBe(400);
    expect(listProducts).not.toHaveBeenCalled();
    expect(await response.json()).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'INVALID_PAGINATION' }),
    }));
  });
});
