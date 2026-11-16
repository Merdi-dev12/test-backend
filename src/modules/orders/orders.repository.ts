import { pool } from '../../database/pool.js';
import type { CreateOrderInput } from './orders.schema.js';

export interface Order {
  id: string;
  productId: string;
  quantity: number;
  unitPriceCdf: number;
  totalCdf: number;
  status: 'PENDING' | 'PAID';
  createdAt: Date;
  paidAt: Date | null;
}

interface OrderRow {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_cdf: number;
  status: 'PENDING' | 'PAID';
  created_at: Date;
  paid_at: Date | null;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPriceCdf: row.unit_price_cdf,
    totalCdf: row.unit_price_cdf * row.quantity,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

const orderColumns = 'id, product_id, quantity, unit_price_cdf, status, created_at, paid_at';

export async function insertOrder(id: string, input: CreateOrderInput): Promise<Order | null> {
  const result = await pool.query<OrderRow>(
    `INSERT INTO orders (id, product_id, quantity, unit_price_cdf)
     SELECT $1, id, $3, price_cdf FROM products WHERE id = $2 AND stock >= $3
     RETURNING ${orderColumns}`,
    [id, input.productId, input.quantity],
  );
  return result.rows[0] ? toOrder(result.rows[0]) : null;
}

export async function productExists(id: string): Promise<boolean> {
  const result = await pool.query('SELECT 1 FROM products WHERE id = $1', [id]);
  return result.rowCount !== 0;
}

export async function findOrder(id: string): Promise<Order | null> {
  const result = await pool.query<OrderRow>(`SELECT ${orderColumns} FROM orders WHERE id = $1`, [id]);
  return result.rows[0] ? toOrder(result.rows[0]) : null;
}
