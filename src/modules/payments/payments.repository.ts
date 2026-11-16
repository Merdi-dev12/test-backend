import type { PoolClient } from 'pg';

export interface LockedOrder {
  id: string;
  productId: string;
  quantity: number;
  status: 'PENDING' | 'PAID';
}

export async function lockOrder(client: PoolClient, orderId: string): Promise<LockedOrder | null> {
  const result = await client.query<{ id: string; product_id: string; quantity: number; status: 'PENDING' | 'PAID' }>(
    'SELECT id, product_id, quantity, status FROM orders WHERE id = $1 FOR UPDATE', [orderId],
  );
  const row = result.rows[0];
  return row ? { id: row.id, productId: row.product_id, quantity: row.quantity, status: row.status } : null;
}

export async function findPaymentForOrder(client: PoolClient, orderId: string): Promise<string | null> {
  const result = await client.query<{ payment_reference: string }>(
    'SELECT payment_reference FROM payments WHERE order_id = $1', [orderId],
  );
  return result.rows[0]?.payment_reference ?? null;
}

export async function findPaymentOrderByReference(client: PoolClient, reference: string): Promise<string | null> {
  const result = await client.query<{ order_id: string }>(
    'SELECT order_id FROM payments WHERE payment_reference = $1', [reference],
  );
  return result.rows[0]?.order_id ?? null;
}

export async function insertPayment(client: PoolClient, id: string, orderId: string, reference: string): Promise<void> {
  await client.query(
    'INSERT INTO payments (id, order_id, payment_reference) VALUES ($1, $2, $3)',
    [id, orderId, reference],
  );
}

export async function decrementStock(client: PoolClient, productId: string, quantity: number): Promise<boolean> {
  const result = await client.query(
    'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING id',
    [quantity, productId],
  );
  return result.rowCount === 1;
}

export async function markOrderPaid(client: PoolClient, orderId: string): Promise<void> {
  await client.query('UPDATE orders SET status = $2, paid_at = now() WHERE id = $1', [orderId, 'PAID']);
}
