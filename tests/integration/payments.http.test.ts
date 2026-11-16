import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe.skipIf(process.env.RUN_DB_TESTS !== 'true')('payments HTTP + PostgreSQL', () => {
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
    await pool.query('SELECT 1 FROM payments LIMIT 1');
    server = appModule.app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (pool && orderIds.length) {
      await pool.query('DELETE FROM payments WHERE order_id = ANY($1::uuid[])', [orderIds]);
      await pool.query('DELETE FROM orders WHERE id = ANY($1::uuid[])', [orderIds]);
    }
    if (pool && productIds.length) await pool.query('DELETE FROM products WHERE id = ANY($1::uuid[])', [productIds]);
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (pool) await pool.end();
  });

  async function createOrder(stock: number, quantity = 1) {
    const productResponse = await fetch(`${baseUrl}/api/products`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `Produit ${randomUUID()}`, priceCdf: 5000, stock }),
    });
    expect(productResponse.status).toBe(201);
    const product = await productResponse.json() as { id: string };
    productIds.push(product.id);
    return createOrderForProduct(product.id, quantity);
  }

  async function createOrderForProduct(productId: string, quantity: number) {
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
    });
    expect(response.status).toBe(201);
    const order = await response.json() as { id: string; productId: string };
    orderIds.push(order.id);
    return order;
  }

  async function pay(orderId: string, paymentReference: string) {
    return fetch(`${baseUrl}/api/orders/${orderId}/payments`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentReference }),
    });
  }

  async function state(orderId: string, productId: string) {
    const [orders, products, payments] = await Promise.all([
      pool.query<{ status: string }>('SELECT status FROM orders WHERE id = $1', [orderId]),
      pool.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [productId]),
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM payments WHERE order_id = $1', [orderId]),
    ]);
    return { status: orders.rows[0].status, stock: products.rows[0].stock, payments: Number(payments.rows[0].count) };
  }

  it('paie une seule fois et répond clairement à la répétition', async () => {
    const order = await createOrder(3, 2);
    const reference = `pay-${randomUUID()}`;
    const first = await pay(order.id, reference);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ orderId: order.id, status: 'PAID', alreadyProcessed: false });
    expect(await state(order.id, order.productId)).toEqual({ status: 'PAID', stock: 1, payments: 1 });
    const orderResponse = await fetch(`${baseUrl}/api/orders/${order.id}`);
    expect(orderResponse.status).toBe(200);
    expect(await orderResponse.json()).toMatchObject({ id: order.id, status: 'PAID' });

    const again = await pay(order.id, reference);
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ alreadyProcessed: true, paymentReference: reference });
    expect(await state(order.id, order.productId)).toEqual({ status: 'PAID', stock: 1, payments: 1 });

    const another = await pay(order.id, `pay-${randomUUID()}`);
    expect(another.status).toBe(409);
    expect(await another.json()).toMatchObject({ error: { code: 'ORDER_ALREADY_PAID' } });
  });

  it('refuse une référence déjà utilisée pour une autre commande', async () => {
    const firstOrder = await createOrder(2);
    const secondOrder = await createOrder(2);
    const reference = `pay-${randomUUID()}`;
    expect((await pay(firstOrder.id, reference)).status).toBe(200);
    const reused = await pay(secondOrder.id, reference);
    expect(reused.status).toBe(409);
    expect(await reused.json()).toMatchObject({ error: { code: 'PAYMENT_REFERENCE_CONFLICT' } });
    expect(await state(secondOrder.id, secondOrder.productId)).toEqual({ status: 'PENDING', stock: 2, payments: 0 });
  });

  it('sérialise deux appels simultanés sur la même commande', async () => {
    const order = await createOrder(1);
    const reference = `pay-${randomUUID()}`;
    const responses = await Promise.all([pay(order.id, reference), pay(order.id, reference)]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const bodies = await Promise.all(responses.map((response) => response.json())) as { alreadyProcessed: boolean }[];
    expect(bodies.map((body) => body.alreadyProcessed).sort()).toEqual([false, true]);
    expect(await state(order.id, order.productId)).toEqual({ status: 'PAID', stock: 0, payments: 1 });
  });

  it('refuse une seconde référence simultanée pour la même commande', async () => {
    const order = await createOrder(1);
    const responses = await Promise.all([
      pay(order.id, `pay-${randomUUID()}`),
      pay(order.id, `pay-${randomUUID()}`),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const rejected = responses.find((response) => response.status === 409)!;
    expect(await rejected.json()).toMatchObject({ error: { code: 'ORDER_ALREADY_PAID' } });
    expect(await state(order.id, order.productId)).toEqual({ status: 'PAID', stock: 0, payments: 1 });
  });

  it('accepte une référence simultanée pour une seule commande', async () => {
    const first = await createOrder(1);
    const second = await createOrder(1);
    const reference = `pay-${randomUUID()}`;
    const responses = await Promise.all([pay(first.id, reference), pay(second.id, reference)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const rejected = responses.find((response) => response.status === 409)!;
    expect(await rejected.json()).toMatchObject({ error: { code: 'PAYMENT_REFERENCE_CONFLICT' } });
    const states = await Promise.all([state(first.id, first.productId), state(second.id, second.productId)]);
    expect(states.map((item) => item.status).sort()).toEqual(['PAID', 'PENDING']);
    expect(states.map((item) => item.payments).sort()).toEqual([0, 1]);
    expect(states.map((item) => item.stock).sort()).toEqual([0, 1]);
  });

  it('ne vend pas deux fois la dernière unité sur deux commandes', async () => {
    const first = await createOrder(1);
    const second = await createOrderForProduct(first.productId, 1);
    const responses = await Promise.all([
      pay(first.id, `pay-${randomUUID()}`),
      pay(second.id, `pay-${randomUUID()}`),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const states = await Promise.all([state(first.id, first.productId), state(second.id, second.productId)]);
    expect(states.map((item) => item.status).sort()).toEqual(['PAID', 'PENDING']);
    expect(states.map((item) => item.payments).sort()).toEqual([0, 1]);
    expect(states[0].stock).toBe(0);
  });

  it('refuse les données invalides et une commande absente', async () => {
    const invalid = await pay('not-a-uuid', '');
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: { code: 'INVALID_PAYMENT' } });
    const absent = await pay(randomUUID(), `pay-${randomUUID()}`);
    expect(absent.status).toBe(404);
    expect(await absent.json()).toMatchObject({ error: { code: 'ORDER_NOT_FOUND' } });
  });
});
