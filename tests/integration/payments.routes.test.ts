import 'dotenv/config';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { initiatePayment, getOrderPayment, refreshPayment } = vi.hoisted(() => ({
  initiatePayment: vi.fn(), getOrderPayment: vi.fn(), refreshPayment: vi.fn(),
}));
vi.mock('../../src/modules/payments/payments.service.js', () => ({ initiatePayment, getOrderPayment, refreshPayment,
  PaymentError: class PaymentError extends Error {} }));

describe('payments HTTP contract', () => {
  let server: Server;
  let baseUrl: string;
  const orderId = '3c72047f-5fc9-4439-824c-4d388319454e';

  beforeAll(async () => {
    const { app } = await import('../../src/app.js');
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('initie avec opérateur et numéro sans accepter une référence inventée', async () => {
    initiatePayment.mockResolvedValue({ orderId, depositId: orderId, status: 'PENDING', alreadyProcessed: false });
    const response = await fetch(`${baseUrl}/api/orders/${orderId}/payments`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' }),
    });
    expect(response.status).toBe(202);
    expect(initiatePayment).toHaveBeenCalledWith(orderId,
      { provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' });
    const invalid = await fetch(`${baseUrl}/api/orders/${orderId}/payments`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentReference: 'invented' }),
    });
    expect(invalid.status).toBe(400);
  });

  it('revérifie le paiement au GET et au callback', async () => {
    getOrderPayment.mockResolvedValue({ orderId, depositId: orderId, status: 'COMPLETED' });
    const response = await fetch(`${baseUrl}/api/orders/${orderId}/payments`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ orderId, depositId: orderId, status: 'COMPLETED' });
    expect(getOrderPayment).toHaveBeenCalledWith(orderId);
    refreshPayment.mockResolvedValue({ id: orderId, status: 'COMPLETED' });
    const callback = await fetch(`${baseUrl}/api/webhooks/pawapay/deposits`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ depositId: orderId, status: 'FAILED' }),
    });
    expect(callback.status).toBe(200);
    expect(refreshPayment).toHaveBeenCalledWith(orderId);
  });
});
