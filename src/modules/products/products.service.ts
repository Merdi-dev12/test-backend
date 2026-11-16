import { randomUUID } from 'node:crypto';
import { findProducts, insertProduct } from './products.repository.js';
import type { CreateProductInput, ListProductsInput } from './products.schema.js';

export function createProduct(input: CreateProductInput) {
  return insertProduct(randomUUID(), input);
}

export async function listProducts(input: ListProductsInput) {
  const { items, total } = await findProducts(input);
  return { items, page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) };
}
