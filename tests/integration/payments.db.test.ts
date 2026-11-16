import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PaymentGateway } from '../../src/modules/payments/payment.gateway.js';

describe.skipIf(process.env.RUN_DB_TESTS !== 'true')('paiements pawaPay et PostgreSQL', () => {
  let pool: typeof import('../../src/database/pool.js').pool;
  let initiatePayment: typeof import('../../src/modules/payments/payments.service.js').initiatePayment;
  let refreshPayment: typeof import('../../src/modules/payments/payments.service.js').refreshPayment;
  let getOrderPayment: typeof import('../../src/modules/payments/payments.service.js').getOrderPayment;
  const products: string[] = [];
  const orders: string[] = [];
  const input = { provider: 'VODACOM_MPESA_COD' as const, phoneNumber: '243813456789' };

  beforeAll(async () => {
    const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Configuration PostgreSQL absente : ${missing.join(', ')}`);
    const db = await import('../../src/database/pool.js');
    const service = await import('../../src/modules/payments/payments.service.js');
    pool = db.pool;
    initiatePayment = service.initiatePayment;
    refreshPayment = service.refreshPayment;
    getOrderPayment = service.getOrderPayment;
    await pool.query('SELECT 1 FROM payment_attempts LIMIT 1');
  });

  afterAll(async () => {
    if (!pool) return;
    if (orders.length) {
      await pool.query('DELETE FROM payments WHERE order_id = ANY($1::uuid[])', [orders]);
      await pool.query('DELETE FROM payment_attempts WHERE order_id = ANY($1::uuid[])', [orders]);
      await pool.query('DELETE FROM orders WHERE id = ANY($1::uuid[])', [orders]);
    }
    if (products.length) await pool.query('DELETE FROM products WHERE id = ANY($1::uuid[])', [products]);
    await pool.end();
  });

  async function createOrder(stock = 3, quantity = 2) {
    const productId = randomUUID();
    const orderId = randomUUID();
    products.push(productId);
    orders.push(orderId);
    await pool.query('INSERT INTO products (id, name, price_cdf, stock) VALUES ($1, $2, $3, $4)',
      [productId, 'Produit test', 5000, stock]);
    await pool.query('INSERT INTO orders (id, product_id, quantity, unit_price_cdf) VALUES ($1, $2, $3, $4)',
      [orderId, productId, quantity, 5000]);
    return { orderId, productId };
  }

  async function state(orderId: string, productId: string) {
    const [product, order, payments, attempts] = await Promise.all([
      pool.query<{ stock: number; reserved_stock: number }>('SELECT stock, reserved_stock FROM products WHERE id = $1', [productId]),
      pool.query<{ status: string }>('SELECT status FROM orders WHERE id = $1', [orderId]),
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM payments WHERE order_id = $1', [orderId]),
      pool.query<{ status: string }>('SELECT status FROM payment_attempts WHERE order_id = $1 ORDER BY created_at', [orderId]),
    ]);
    return { ...product.rows[0], order: order.rows[0].status, payments: Number(payments.rows[0].count),
      attempts: attempts.rows.map((row) => row.status) };
  }

  function gateway(final: 'succeeded' | 'failed' | 'pending' | 'not_found' = 'succeeded'): PaymentGateway {
    return {
      initiate: vi.fn().mockResolvedValue('accepted'),
      getStatus: vi.fn().mockImplementation(async (depositId: string) => final === 'not_found'
        ? { status: 'not_found' }
        : { status: final, depositId, amountCdf: 10000, currency: 'CDF', country: 'COD',
          provider: input.provider, phoneNumber: input.phoneNumber }),
    };
  }

  it('réserve puis finalise une seule fois malgré les appels concurrents', async () => {
    const { orderId, productId } = await createOrder();
    const provider = gateway();
    const responses = await Promise.all([
      initiatePayment(orderId, input, provider), initiatePayment(orderId, input, provider),
    ]);
    expect(responses[0].depositId).toBe(responses[1].depositId);
    expect(provider.initiate).toHaveBeenCalledTimes(1);
    expect(await state(orderId, productId)).toMatchObject({ stock: 3, reserved_stock: 2, order: 'PENDING', payments: 0 });

    await Promise.all([refreshPayment(responses[0].depositId, provider), refreshPayment(responses[0].depositId, provider)]);
    expect(await state(orderId, productId)).toEqual({ stock: 1, reserved_stock: 0,
      order: 'PAID', payments: 1, attempts: ['COMPLETED'] });
    expect((await refreshPayment(responses[0].depositId, provider)).status).toBe('COMPLETED');
    expect(await getOrderPayment(orderId, provider)).toEqual({
      orderId, depositId: responses[0].depositId, status: 'COMPLETED',
    });
    await expect(initiatePayment(orderId, input, provider)).rejects.toMatchObject({ code: 'ORDER_ALREADY_PAID' });
    expect(provider.initiate).toHaveBeenCalledTimes(1);
  });

  it('libère le stock après un échec confirmé et permet une nouvelle tentative', async () => {
    const { orderId, productId } = await createOrder();
    const failedGateway = gateway('failed');
    const first = await initiatePayment(orderId, input, failedGateway);
    expect((await refreshPayment(first.depositId, failedGateway)).status).toBe('FAILED');
    expect(await state(orderId, productId)).toMatchObject({ stock: 3, reserved_stock: 0, order: 'PENDING' });
    const second = await initiatePayment(orderId, input, gateway());
    expect(second.depositId).not.toBe(first.depositId);
    expect(await state(orderId, productId)).toMatchObject({ reserved_stock: 2, attempts: ['FAILED', 'PENDING'] });
  });

  it('garde le même dépôt après une coupure réseau et le recherche avant de relancer', async () => {
    const { orderId, productId } = await createOrder();
    const provider = gateway('not_found');
    vi.mocked(provider.initiate).mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce('accepted');
    const first = await initiatePayment(orderId, input, provider);
    expect(first.status).toBe('UNKNOWN');
    expect((await refreshPayment(first.depositId, provider)).status).toBe('PENDING');
    expect(vi.mocked(provider.initiate).mock.calls[0][0].depositId)
      .toBe(vi.mocked(provider.initiate).mock.calls[1][0].depositId);
    expect(await state(orderId, productId)).toMatchObject({ stock: 3, reserved_stock: 2, payments: 0 });
  });

  it('refuse une confirmation avec un montant contradictoire', async () => {
    const { orderId, productId } = await createOrder();
    const provider = gateway();
    const attempt = await initiatePayment(orderId, input, provider);
    vi.mocked(provider.getStatus).mockResolvedValueOnce({ status: 'succeeded', depositId: attempt.depositId,
      amountCdf: 1, currency: 'CDF', country: 'COD', provider: input.provider, phoneNumber: input.phoneNumber });
    await expect(refreshPayment(attempt.depositId, provider)).rejects.toMatchObject({ code: 'PROVIDER_MISMATCH' });
    expect(await state(orderId, productId)).toMatchObject({ stock: 3, reserved_stock: 2, order: 'PENDING', payments: 0 });
  });

  it('empêche deux collectes de réserver la dernière unité', async () => {
    const { orderId, productId } = await createOrder(1, 1);
    const otherOrderId = randomUUID();
    orders.push(otherOrderId);
    await pool.query('INSERT INTO orders (id, product_id, quantity, unit_price_cdf) VALUES ($1, $2, $3, $4)',
      [otherOrderId, productId, 1, 5000]);
    const provider = gateway('pending');
    const results = await Promise.allSettled([
      initiatePayment(orderId, input, provider), initiatePayment(otherOrderId, input, provider),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const product = await pool.query<{ stock: number; reserved_stock: number }>(
      'SELECT stock, reserved_stock FROM products WHERE id = $1', [productId]);
    expect(product.rows[0]).toEqual({ stock: 1, reserved_stock: 1 });
  });
});
