import { WompiClient } from './client';
import { integritySignature } from './signatures';
import { WompiError } from './types';

type Call = { url: string; init: RequestInit };

function mockFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const impl = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift() ?? { status: 500, body: { error: 'none' } };
    return new Response(JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const opts = {
  apiUrl: 'https://sandbox.wompi.co/v1',
  publicKey: 'pub_test_x',
  privateKey: 'prv_test_y',
  integritySecret: 'test_integrity_z',
};

describe('WompiClient', () => {
  it('fetches acceptance tokens with the merchant public-key header', async () => {
    const { impl, calls } = mockFetch([
      {
        body: {
          data: {
            presigned_acceptance: {
              acceptance_token: 'a',
              permalink: 'p',
              type: 'END_USER_POLICY',
            },
            presigned_personal_data_auth: {
              acceptance_token: 'b',
              permalink: 'q',
              type: 'PERSONAL_DATA_AUTH',
            },
          },
        },
      },
    ]);
    const client = new WompiClient({ ...opts, fetch: impl });
    const tokens = await client.getAcceptanceTokens();
    expect(tokens.presigned_acceptance.acceptance_token).toBe('a');
    expect(calls[0].url).toBe('https://sandbox.wompi.co/v1/merchants/info');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['x-merchant-public-key']).toBe('pub_test_x');
    expect(headers.Authorization).toBeUndefined();
  });

  it('creates a payment source with the private key', async () => {
    const { impl, calls } = mockFetch([
      {
        status: 201,
        body: { data: { id: 3891, type: 'CARD', status: 'AVAILABLE' } },
      },
    ]);
    const client = new WompiClient({ ...opts, fetch: impl });
    const source = await client.createPaymentSource({
      token: 'tok_test_1',
      customerEmail: 'a@b.co',
      acceptanceToken: 'acc',
      acceptPersonalAuth: 'pda',
    });
    expect(source.id).toBe(3891);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer prv_test_y');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      type: 'CARD',
      token: 'tok_test_1',
      customer_email: 'a@b.co',
      acceptance_token: 'acc',
      accept_personal_auth: 'pda',
    });
  });

  it('signs transactions and defaults to one recurrent installment', async () => {
    const { impl, calls } = mockFetch([
      {
        status: 201,
        body: { data: { id: 'trx-1', status: 'PENDING', reference: 'sub_1' } },
      },
    ]);
    const client = new WompiClient({ ...opts, fetch: impl });
    const trx = await client.createTransaction({
      amountInCents: 2000000,
      customerEmail: 'a@b.co',
      reference: 'sub_1',
      paymentSourceId: 3891,
    });
    expect(trx.id).toBe('trx-1');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      amount_in_cents: 2000000,
      currency: 'COP',
      signature: integritySignature(
        'sub_1',
        2000000,
        'COP',
        'test_integrity_z',
      ),
      customer_email: 'a@b.co',
      payment_method: { installments: 1 },
      reference: 'sub_1',
      payment_source_id: 3891,
      recurrent: true,
    });
  });

  it('reads a transaction by id with the private key', async () => {
    const { impl, calls } = mockFetch([
      { body: { data: { id: 'trx-1', status: 'APPROVED' } } },
    ]);
    const client = new WompiClient({ ...opts, fetch: impl });
    const trx = await client.getTransaction('trx-1');
    expect(trx.status).toBe('APPROVED');
    expect(calls[0].url).toBe('https://sandbox.wompi.co/v1/transactions/trx-1');
    expect(
      (calls[0].init.headers as Record<string, string>).Authorization,
    ).toBe('Bearer prv_test_y');
  });

  it('throws WompiError with the response body on failures', async () => {
    const { impl } = mockFetch([
      { status: 422, body: { error: { type: 'INPUT_VALIDATION_ERROR' } } },
    ]);
    const client = new WompiClient({ ...opts, fetch: impl });
    await expect(client.getTransaction('nope')).rejects.toMatchObject({
      name: 'WompiError',
      status: 422,
      body: { error: { type: 'INPUT_VALIDATION_ERROR' } },
    } satisfies Partial<WompiError>);
  });
});
