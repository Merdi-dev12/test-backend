import { z } from 'zod';
import { env } from '../../config/env.js';
import type { DepositRequest, DepositState, PaymentGateway } from './payment.gateway.js';

const initiationSchema = z.object({ status: z.enum(['ACCEPTED', 'REJECTED', 'DUPLICATE_IGNORED']) });
const statusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('NOT_FOUND') }),
  z.object({
    status: z.literal('FOUND'),
    data: z.object({
      depositId: z.uuid(), status: z.enum(['COMPLETED', 'FAILED', 'PROCESSING', 'SUBMITTED']),
      amount: z.string(), currency: z.string(), country: z.string(),
      payer: z.object({ accountDetails: z.object({ provider: z.string(), phoneNumber: z.string() }) }),
    }),
  }),
]);

function config() {
  if (!env.PAWAPAY_BASE_URL || !env.PAWAPAY_API_TOKEN) throw new Error('PAWAPAY_NOT_CONFIGURED');
  return { baseUrl: env.PAWAPAY_BASE_URL, token: env.PAWAPAY_API_TOKEN };
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const { baseUrl, token } = config();
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.body ? { 'content-type': 'application/json' } : {}) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`PAWAPAY_HTTP_${response.status}`);
  return response.json();
}

export const pawapayGateway: PaymentGateway = {
  async initiate(input: DepositRequest) {
    const body = {
      depositId: input.depositId,
      amount: String(input.amountCdf),
      currency: 'CDF',
      payer: { type: 'MMO', accountDetails: { phoneNumber: input.phoneNumber, provider: input.provider } },
    };
    const result = initiationSchema.parse(await request('/v2/deposits', { method: 'POST', body: JSON.stringify(body) }));
    return result.status === 'ACCEPTED' ? 'accepted' : result.status === 'REJECTED' ? 'rejected' : 'duplicate';
  },
  async getStatus(depositId: string): Promise<DepositState> {
    const result = statusSchema.parse(await request(`/v2/deposits/${depositId}`));
    if (result.status === 'NOT_FOUND') return { status: 'not_found' };
    const data = result.data;
    const amountCdf = Number(data.amount);
    if (!Number.isSafeInteger(amountCdf) || amountCdf < 0) throw new Error('PAWAPAY_INVALID_AMOUNT');
    const status = data.status === 'COMPLETED' ? 'succeeded' : data.status === 'FAILED' ? 'failed' : 'pending';
    return { status, depositId: data.depositId, amountCdf, currency: data.currency, country: data.country,
      provider: data.payer.accountDetails.provider, phoneNumber: data.payer.accountDetails.phoneNumber };
  },
};
