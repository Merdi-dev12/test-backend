import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

describe.skipIf(process.env.RUN_DB_TESTS !== 'true')('products HTTP + PostgreSQL', () => {
  let server: Server;
  let baseUrl: string;
  let pool: typeof import('../../src/database/pool.js').pool;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Configuration PostgreSQL absente : ${missing.join(', ')}. Créer .env depuis .env.example, renseigner les identifiants, démarrer PostgreSQL et appliquer les migrations avant RUN_DB_TESTS=true.`);
    }
    const [appModule, dbModule] = await Promise.all([
      import('../../src/app.js'),
      import('../../src/database/pool.js'),
    ]);
    pool = dbModule.pool;
    await pool.query('SELECT 1 FROM products LIMIT 1');
    server = appModule.app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (createdIds.length) await pool.query('DELETE FROM products WHERE id = ANY($1::uuid[])', [createdIds]);
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (pool) await pool.end();
  });

  async function createTestProduct(name: string) {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, priceCdf: 5000, stock: 10 }),
    });
    expect(response.status).toBe(201);
    const product = await response.json() as { id: string; name: string; priceCdf: number };
    createdIds.push(product.id);
    return product;
  }

  it('crée un produit puis le retrouve dans la liste', async () => {
    const product = await createTestProduct('Savon');
    expect(product.priceCdf).toBe(5000);

    const listed = await fetch(`${baseUrl}/api/products`);
    expect(listed.status).toBe(200);
    expect(await listed.json()).toEqual(expect.objectContaining({
      items: expect.arrayContaining([expect.objectContaining({ id: product.id })]),
      page: 1, limit: 20,
    }));
  });

  it('pagine les résultats et expose le total', async () => {
    await createTestProduct('Produit A');
    await createTestProduct('Produit B');
    const response = await fetch(`${baseUrl}/api/products?page=1&limit=1`);
    expect(response.status).toBe(200);
    const body = await response.json() as { items: { id: string }[]; total: number; totalPages: number; page: number; limit: number };
    expect(body).toMatchObject({ page: 1, limit: 1 });
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.totalPages).toBe(body.total);
    expect(body.items).toHaveLength(1);

    const next = await fetch(`${baseUrl}/api/products?page=2&limit=1`);
    expect(next.status).toBe(200);
    const nextBody = await next.json() as { items: { id: string }[] };
    expect(nextBody.items).toHaveLength(1);
    expect(nextBody.items[0].id).not.toBe(body.items[0].id);
  });

  it('refuse une entrée invalide avec une erreur claire', async () => {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '', priceCdf: -1, stock: 1 }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'INVALID_PRODUCT' }),
    }));
  });

  it('crée un produit sans clé administrateur', async () => {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Sans clé', priceCdf: 5000, stock: 1 }),
    });
    expect(response.status).toBe(201);
    const product = await response.json() as { id: string };
    createdIds.push(product.id);
  });

  it('refuse une pagination invalide', async () => {
    const response = await fetch(`${baseUrl}/api/products?page=0&limit=101`);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'INVALID_PAGINATION' }),
    }));
  });
});
