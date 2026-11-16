import type { PoolClient } from 'pg';
import { pool } from '../../database/pool.js';

export interface LockedOrder {
  id: string;
  productId: string;
  quantity: number;
  amountCdf: number;
  status: 'PENDING' | 'PAID';
}

export type AttemptStatus = 'INITIATING' | 'PENDING' | 'UNKNOWN' | 'FAILED' | 'COMPLETED';

export interface PaymentAttempt {
  id: string;
  orderId: string;
  provider: string;
  phoneNumber: string;
  amountCdf: number;
  status: AttemptStatus;
}

interface AttemptRow {
  id: string;
  order_id: string;
  provider: string;
  phone_number: string;
  amount_cdf: string;
  status: AttemptStatus;
}

const attemptColumns = 'id, order_id, provider, phone_number, amount_cdf, status';

function toAttempt(row: AttemptRow): PaymentAttempt {
  return { id: row.id, orderId: row.order_id, provider: row.provider, phoneNumber: row.phone_number,
    amountCdf: Number(row.amount_cdf), status: row.status };
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function lockOrder(client: PoolClient, orderId: string): Promise<LockedOrder | null> {
  const result = await client.query<{ id: string; product_id: string; quantity: number; unit_price_cdf: number; status: LockedOrder['status'] }>(
    'SELECT id, product_id, quantity, unit_price_cdf, status FROM orders WHERE id = $1 FOR UPDATE', [orderId],
  );
  const row = result.rows[0];
  return row ? { id: row.id, productId: row.product_id, quantity: row.quantity,
    amountCdf: row.unit_price_cdf * row.quantity, status: row.status } : null;
}

export async function findActiveAttempt(client: PoolClient, orderId: string): Promise<PaymentAttempt | null> {
  const result = await client.query<AttemptRow>(
    `SELECT ${attemptColumns} FROM payment_attempts WHERE order_id = $1 AND status <> 'FAILED'
     ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [orderId],
  );
  return result.rows[0] ? toAttempt(result.rows[0]) : null;
}

export async function findAttemptById(id: string): Promise<PaymentAttempt | null> {
  const result = await pool.query<AttemptRow>(`SELECT ${attemptColumns} FROM payment_attempts WHERE id = $1`, [id]);
  return result.rows[0] ? toAttempt(result.rows[0]) : null;
}

export async function findLatestAttempt(client: PoolClient, orderId: string): Promise<PaymentAttempt | null> {
  const result = await client.query<AttemptRow>(
    `SELECT ${attemptColumns} FROM payment_attempts WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`, [orderId],
  );
  return result.rows[0] ? toAttempt(result.rows[0]) : null;
}

export async function listUnresolvedAttemptIds(): Promise<string[]> {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM payment_attempts WHERE status IN ('INITIATING', 'PENDING', 'UNKNOWN')
     ORDER BY updated_at LIMIT 100`,
  );
  return result.rows.map((row) => row.id);
}

export async function reserveStock(client: PoolClient, productId: string, quantity: number): Promise<boolean> {
  const result = await client.query(
    'UPDATE products SET reserved_stock = reserved_stock + $1 WHERE id = $2 AND stock - reserved_stock >= $1',
    [quantity, productId],
  );
  return result.rowCount === 1;
}

export async function insertAttempt(client: PoolClient, attempt: PaymentAttempt): Promise<void> {
  await client.query(
    `INSERT INTO payment_attempts (id, order_id, provider, phone_number, amount_cdf, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [attempt.id, attempt.orderId, attempt.provider, attempt.phoneNumber, attempt.amountCdf, attempt.status],
  );
}

export async function setAttemptStatus(client: PoolClient, id: string, status: AttemptStatus): Promise<void> {
  await client.query('UPDATE payment_attempts SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
}

export async function releaseStock(client: PoolClient, productId: string, quantity: number): Promise<void> {
  await client.query('UPDATE products SET reserved_stock = reserved_stock - $1 WHERE id = $2', [quantity, productId]);
}

export async function consumeStock(client: PoolClient, productId: string, quantity: number): Promise<void> {
  await client.query(
    'UPDATE products SET stock = stock - $1, reserved_stock = reserved_stock - $1 WHERE id = $2',
    [quantity, productId],
  );
}

export async function recordPayment(client: PoolClient, orderId: string, depositId: string): Promise<void> {
  await client.query('INSERT INTO payments (id, order_id, payment_reference) VALUES ($1::uuid, $2, $1::text)', [depositId, orderId]);
  await client.query('UPDATE orders SET status = $2, paid_at = now() WHERE id = $1', [orderId, 'PAID']);
}
