import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({ env: {
  PAWAPAY_BASE_URL: 'https://api.sandbox.pawapay.io', PAWAPAY_API_TOKEN: 'sandbox-token-for-tests',
} }));

import { pawapayGateway } from '../../src/modules/payments/pawapay.gateway.js';

afterEach(() => vi.unstubAllGlobals());

describe('adaptateur pawaPay', () => {
  it('envoie un dépôt CDF avec un identifiant stable et interprète ACCEPTED', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ACCEPTED' }) });
    vi.stubGlobal('fetch', fetchMock);
    const depositId = 'c86fc900-a21c-4e99-9309-6f366efc1ffd';
    expect(await pawapayGateway.initiate({ depositId, amountCdf: 10000,
      provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' })).toBe('accepted');
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/v2/deposits');
    expect(JSON.parse(options.body as string)).toMatchObject({ depositId, amount: '10000', currency: 'CDF',
      payer: { accountDetails: { provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' } } });
  });

  it('ne transforme pas un résultat final en succès sans identité et montant', async () => {
    const depositId = 'c86fc900-a21c-4e99-9309-6f366efc1ffd';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'FOUND', data: {
      depositId, status: 'COMPLETED', amount: '10000', currency: 'CDF', country: 'COD',
      payer: { accountDetails: { provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' } },
    } }) }));
    expect(await pawapayGateway.getStatus(depositId)).toEqual({ status: 'succeeded', depositId,
      amountCdf: 10000, currency: 'CDF', country: 'COD', provider: 'VODACOM_MPESA_COD', phoneNumber: '243813456789' });
  });
});
