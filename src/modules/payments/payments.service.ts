import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import type { PaymentGateway, DepositState } from './payment.gateway.js';
import { pawapayGateway } from './pawapay.gateway.js';
import {
  consumeStock, findActiveAttempt, findAttemptById, findLatestAttempt, insertAttempt, lockOrder,
  recordPayment, releaseStock, reserveStock, setAttemptStatus, transaction,
  type PaymentAttempt,
} from './payments.repository.js';
import type { InitiatePaymentInput } from './payments.schema.js';

export type PaymentErrorCode = 'ORDER_NOT_FOUND' | 'ORDER_ALREADY_PAID' | 'PAYMENT_IN_PROGRESS'
  | 'PAYMENT_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'PROVIDER_NOT_CONFIGURED' | 'PROVIDER_MISMATCH';

export class PaymentError extends Error {
  constructor(public readonly code: PaymentErrorCode) { super(code); }
}

function publicAttempt(attempt: PaymentAttempt, alreadyProcessed: boolean) {
  return { orderId: attempt.orderId, depositId: attempt.id, status: attempt.status, alreadyProcessed };
}

async function markInitiation(attempt: PaymentAttempt, status: 'PENDING' | 'UNKNOWN' | 'FAILED') {
  return transaction(async (client) => {
    const order = await lockOrder(client, attempt.orderId);
    if (!order) throw new PaymentError('ORDER_NOT_FOUND');
    const current = await findActiveAttempt(client, attempt.orderId);
    if (!current || current.id !== attempt.id || current.status === 'COMPLETED'
      || (current.status === 'PENDING' && status === 'UNKNOWN')) return current ?? attempt;
    if (status === 'FAILED') await releaseStock(client, order.productId, order.quantity);
    await setAttemptStatus(client, attempt.id, status);
    return { ...attempt, status };
  });
}

async function markUnknown(attempt: PaymentAttempt): Promise<PaymentAttempt> {
  return transaction(async (client) => {
    const order = await lockOrder(client, attempt.orderId);
    if (!order) throw new PaymentError('ORDER_NOT_FOUND');
    const current = await findActiveAttempt(client, attempt.orderId);
    if (!current || current.id !== attempt.id) return attempt;
    if (current.status === 'COMPLETED') return current;
    await setAttemptStatus(client, attempt.id, 'UNKNOWN');
    return { ...current, status: 'UNKNOWN' };
  });
}

export async function initiatePayment(orderId: string, input: InitiatePaymentInput, gateway: PaymentGateway = pawapayGateway) {
  if (gateway === pawapayGateway && (!env.PAWAPAY_BASE_URL || !env.PAWAPAY_API_TOKEN)) {
    throw new PaymentError('PROVIDER_NOT_CONFIGURED');
  }
  const { attempt, existing } = await transaction(async (client) => {
    const order = await lockOrder(client, orderId);
    if (!order) throw new PaymentError('ORDER_NOT_FOUND');
    if (order.status === 'PAID') throw new PaymentError('ORDER_ALREADY_PAID');
    const current = await findActiveAttempt(client, orderId);
    if (current) {
      if (current.provider !== input.provider || current.phoneNumber !== input.phoneNumber) {
        throw new PaymentError('PAYMENT_IN_PROGRESS');
      }
      return { attempt: current, existing: true };
    }
    if (!(await reserveStock(client, order.productId, order.quantity))) throw new PaymentError('INSUFFICIENT_STOCK');
    const created: PaymentAttempt = {
      id: randomUUID(), orderId, provider: input.provider, phoneNumber: input.phoneNumber,
      amountCdf: order.amountCdf, status: 'INITIATING',
    };
    await insertAttempt(client, created);
    return { attempt: created, existing: false };
  });
  if (existing) return publicAttempt(attempt, true);
  let result: 'accepted' | 'rejected' | 'duplicate';
  try {
    result = await gateway.initiate({
      depositId: attempt.id, provider: attempt.provider, phoneNumber: attempt.phoneNumber,
      amountCdf: attempt.amountCdf,
    });
  } catch {
    return publicAttempt(await markInitiation(attempt, 'UNKNOWN'), false);
  }
  if (result === 'duplicate') return publicAttempt(await refreshPayment(attempt.id, gateway), false);
  return publicAttempt(await markInitiation(attempt, result === 'rejected' ? 'FAILED' : 'PENDING'), false);
}

function verifyProviderResult(attempt: PaymentAttempt, result: Exclude<DepositState, { status: 'not_found' }>) {
  if (result.depositId !== attempt.id || result.amountCdf !== attempt.amountCdf || result.currency !== 'CDF'
    || result.country !== 'COD' || result.provider !== attempt.provider
    || result.phoneNumber !== attempt.phoneNumber) throw new PaymentError('PROVIDER_MISMATCH');
}

async function finalize(attempt: PaymentAttempt, result: Exclude<DepositState, { status: 'not_found' }>) {
  verifyProviderResult(attempt, result);
  return transaction(async (client) => {
    const order = await lockOrder(client, attempt.orderId);
    if (!order) throw new PaymentError('ORDER_NOT_FOUND');
    const current = await findActiveAttempt(client, attempt.orderId);
    if (!current || current.id !== attempt.id) throw new PaymentError('PAYMENT_NOT_FOUND');
    if (current.status === 'COMPLETED' || current.status === 'FAILED') return current;
    if (result.status === 'succeeded') {
      await consumeStock(client, order.productId, order.quantity);
      await recordPayment(client, order.id, attempt.id);
      await setAttemptStatus(client, attempt.id, 'COMPLETED');
      return { ...current, status: 'COMPLETED' as const };
    }
    if (result.status === 'failed') {
      await releaseStock(client, order.productId, order.quantity);
      await setAttemptStatus(client, attempt.id, 'FAILED');
      return { ...current, status: 'FAILED' as const };
    }
    await setAttemptStatus(client, attempt.id, 'PENDING');
    return { ...current, status: 'PENDING' as const };
  });
}

export async function refreshPayment(depositId: string, gateway: PaymentGateway = pawapayGateway): Promise<PaymentAttempt> {
  const attempt = await findAttemptById(depositId);
  if (!attempt) throw new PaymentError('PAYMENT_NOT_FOUND');
  if (attempt.status === 'COMPLETED' || attempt.status === 'FAILED') return attempt;
  let result: DepositState;
  try {
    result = await gateway.getStatus(depositId);
  } catch {
    return markUnknown(attempt);
  }
  if (result.status !== 'not_found') return finalize(attempt, result);
  if (attempt.status === 'INITIATING' || attempt.status === 'UNKNOWN' || attempt.status === 'PENDING') {
    try {
      const initiation = await gateway.initiate({ depositId: attempt.id, amountCdf: attempt.amountCdf,
        provider: attempt.provider, phoneNumber: attempt.phoneNumber });
      return initiation === 'rejected' ? markUnknown(attempt) : markInitiation(attempt, 'PENDING');
    } catch {
      return markInitiation(attempt, 'UNKNOWN');
    }
  }
  return attempt;
}

export async function getOrderPayment(orderId: string, gateway: PaymentGateway = pawapayGateway) {
  const attempt = await transaction(async (client) => {
    const order = await lockOrder(client, orderId);
    if (!order) throw new PaymentError('ORDER_NOT_FOUND');
    return findLatestAttempt(client, orderId);
  });
  if (!attempt) throw new PaymentError('PAYMENT_NOT_FOUND');
  return publicAttempt(await refreshPayment(attempt.id, gateway), true);
}
