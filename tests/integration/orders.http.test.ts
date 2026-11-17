import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe.skipIf(process.env.RUN_DB_TESTS !== 'true')('orders HTTP + PostgreSQL', () => {
  let server: Server;
  let baseUrl: string;
  let pool: typeof import('../../src/database/pool.js').pool;
  const productIds: string[] = [];
  const orderIds: string[] = [];

  beforeAll(async () => {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Configuration PostgreSQL absente : ${missing.join(', ')}. Créer .env et appliquer les migrations.`);
    const [appModule, dbModule] = await Promise.all([import('../../src/app.js'), import('../../src/database/pool.js')]);
    pool = dbModule.pool;
    await pool.query('SELECT 1 FROM orders LIMIT 1');
    server = appModule.app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (pool && orderIds.length) await pool.query('DELETE FROM orders WHERE id = ANY($1::uuid[])', [orderIds]);
    if (pool && productIds.length) await pool.query('DELETE FROM products WHERE id = ANY($1::uuid[])', [productIds]);
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (pool) await pool.end();
  });

  async function createProduct(stock: number, priceCdf = 5000) {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `Produit ${randomUUID()}`, priceCdf, stock }),
    });
    expect(response.status).toBe(201);
    const product = await response.json() as { id: string };
    productIds.push(product.id);
    return product.id;
  }

  async function postOrder(productId: string, quantity: number) {
    return fetch(`${baseUrl}/api/orders`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
    });
  }

  it('crée puis retrouve une commande en attente avec prix figé et stock inchangé', async () => {
    const productId = await createProduct(3);
    const response = await postOrder(productId, 2);
    expect(response.status).toBe(201);
    const order = await response.json() as { id: string; productId: string; quantity: number; unitPriceCdf: number; totalCdf: number; status: string; paidAt: null };
    orderIds.push(order.id);
    expect(order).toMatchObject({ productId, quantity: 2, unitPriceCdf: 5000, totalCdf: 10000, status: 'PENDING', paidAt: null });

    await pool.query('UPDATE products SET price_cdf = 7000 WHERE id = $1', [productId]);
    const read = await fetch(`${baseUrl}/api/orders/${order.id}`);
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ id: order.id, unitPriceCdf: 5000, totalCdf: 10000, status: 'PENDING' });
    const stock = await pool.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [productId]);
    expect(stock.rows[0].stock).toBe(3);
  });

  it('refuse un stock insuffisant et un produit absent', async () => {
    const productId = await createProduct(1);
    const insufficient = await postOrder(productId, 2);
    expect(insufficient.status).toBe(409);
    expect(await insufficient.json()).toMatchObject({ error: { code: 'INSUFFICIENT_STOCK' } });
    const missing = await postOrder(randomUUID(), 1);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: 'PRODUCT_NOT_FOUND' } });
  });

  it('refuse les données invalides et une commande introuvable', async () => {
    const invalid = await postOrder('invalid', 0);
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: { code: 'INVALID_ORDER' } });
    const missing = await fetch(`${baseUrl}/api/orders/${randomUUID()}`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: 'ORDER_NOT_FOUND' } });
    const malformed = await fetch(`${baseUrl}/api/orders/not-a-uuid`);
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({ error: { code: 'INVALID_ORDER_ID' } });
  });
});
