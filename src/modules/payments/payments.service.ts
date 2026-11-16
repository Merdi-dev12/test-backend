import { randomUUID } from 'node:crypto';
import { pool } from '../../database/pool.js';
import {
  decrementStock, findPaymentForOrder, findPaymentOrderByReference,
  insertPayment, lockOrder, markOrderPaid,
} from './payments.repository.js';
import type { PayOrderInput } from './payments.schema.js';

export type PaymentErrorCode = 'ORDER_NOT_FOUND' | 'ORDER_ALREADY_PAID' | 'PAYMENT_REFERENCE_CONFLICT' | 'INSUFFICIENT_STOCK';

export class PaymentError extends Error {
  constructor(public readonly code: PaymentErrorCode) {
    super(code);
  }
}

export async function payOrder(orderId: string, input: PayOrderInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await lockOrder(client, orderId);
    if (!order) throw new PaymentError('ORDER_NOT_FOUND');

    const previousReference = await findPaymentForOrder(client, orderId);
    if (order.status === 'PAID') {
      if (previousReference === input.paymentReference) {
        await client.query('COMMIT');
        return { orderId, status: 'PAID' as const, paymentReference: input.paymentReference, alreadyProcessed: true };
      }
      throw new PaymentError('ORDER_ALREADY_PAID');
    }

    const referencedOrderId = await findPaymentOrderByReference(client, input.paymentReference);
    if (referencedOrderId) throw new PaymentError('PAYMENT_REFERENCE_CONFLICT');

    await insertPayment(client, randomUUID(), orderId, input.paymentReference);
    if (!(await decrementStock(client, order.productId, order.quantity))) {
      throw new PaymentError('INSUFFICIENT_STOCK');
    }
    await markOrderPaid(client, orderId);
    await client.query('COMMIT');
    return { orderId, status: 'PAID' as const, paymentReference: input.paymentReference, alreadyProcessed: false };
  } catch (error) {
    await client.query('ROLLBACK');
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new PaymentError('PAYMENT_REFERENCE_CONFLICT');
    }
    throw error;
  } finally {
    client.release();
  }
}
