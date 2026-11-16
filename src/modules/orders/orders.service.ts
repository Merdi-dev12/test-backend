import { randomUUID } from 'node:crypto';
import { findOrder, insertOrder, productExists } from './orders.repository.js';
import type { CreateOrderInput } from './orders.schema.js';

export class OrderError extends Error {
  constructor(public readonly code: 'PRODUCT_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'ORDER_NOT_FOUND') {
    super(code);
  }
}

export async function createOrder(input: CreateOrderInput) {
  const order = await insertOrder(randomUUID(), input);
  if (order) return order;
  if (!(await productExists(input.productId))) throw new OrderError('PRODUCT_NOT_FOUND');
  throw new OrderError('INSUFFICIENT_STOCK');
}

export async function getOrder(id: string) {
  const order = await findOrder(id);
  if (!order) throw new OrderError('ORDER_NOT_FOUND');
  return order;
}
