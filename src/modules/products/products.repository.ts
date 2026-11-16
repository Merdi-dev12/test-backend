import { pool } from '../../database/pool.js';
import type { CreateProductInput, ListProductsInput } from './products.schema.js';

export interface Product {
  id: string;
  name: string;
  priceCdf: number;
  stock: number;
  createdAt: Date;
}

interface ProductRow {
  id: string;
  name: string;
  price_cdf: number;
  stock: number;
  created_at: Date;
}

function toProduct(row: ProductRow): Product {
  return { id: row.id, name: row.name, priceCdf: row.price_cdf, stock: row.stock, createdAt: row.created_at };
}

export async function insertProduct(id: string, input: CreateProductInput): Promise<Product> {
  const result = await pool.query<ProductRow>(
    'INSERT INTO products (id, name, price_cdf, stock) VALUES ($1, $2, $3, $4) RETURNING id, name, price_cdf, stock, created_at',
    [id, input.name, input.priceCdf, input.stock],
  );
  return toProduct(result.rows[0]);
}

export async function findProducts(input: ListProductsInput): Promise<{ items: Product[]; total: number }> {
  const offset = (input.page - 1) * input.limit;
  const [countResult, productsResult] = await Promise.all([
    pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM products'),
    pool.query<ProductRow>(
      'SELECT id, name, price_cdf, stock, created_at FROM products ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2',
      [input.limit, offset],
    ),
  ]);
  return { items: productsResult.rows.map(toProduct), total: Number(countResult.rows[0].total) };
}
