import { integritySignature } from './signatures';
import {
  WompiError,
  type WompiAcceptanceTokens,
  type WompiPaymentSource,
  type WompiTransaction,
} from './types';

export interface WompiClientOptions {
  /** e.g. https://sandbox.wompi.co/v1 */
  apiUrl: string;
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  fetch?: typeof fetch;
}

export interface CreatePaymentSourceInput {
  token: string;
  customerEmail: string;
  acceptanceToken: string;
  acceptPersonalAuth: string;
}

export interface CreateTransactionInput {
  amountInCents: number;
  currency?: string;
  customerEmail: string;
  reference: string;
  paymentSourceId: number;
  installments?: number;
  /** Credential-on-file recurring flag (VISA / MasterCard on RBM). */
  recurrent?: boolean;
}

/**
 * Server-side Wompi client. The private key never leaves the server; card data
 * never reaches it (the browser tokenizes with the public key).
 */
export class WompiClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: WompiClientOptions) {
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!opts.apiUrl || !opts.publicKey || !opts.privateKey) {
      throw new Error(
        'WompiClient: apiUrl, publicKey and privateKey are required.',
      );
    }
  }

  private async request<T>(
    path: string,
    init: RequestInit & { auth: 'public' | 'private' | 'merchant' },
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    };
    if (init.auth === 'merchant') {
      headers['x-merchant-public-key'] = this.opts.publicKey;
    } else {
      headers.Authorization = `Bearer ${
        init.auth === 'private' ? this.opts.privateKey : this.opts.publicKey
      }`;
    }
    const res = await this.fetchImpl(`${this.opts.apiUrl}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body,
      cache: 'no-store',
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      throw new WompiError(
        `Wompi ${init.method ?? 'GET'} ${path} → ${res.status}`,
        res.status,
        body,
      );
    }
    return (body as { data: T }).data;
  }

  /** Acceptance + personal-data tokens the user must accept before a payment source. */
  getAcceptanceTokens(): Promise<WompiAcceptanceTokens> {
    return this.request<WompiAcceptanceTokens>('/merchants/info', {
      auth: 'merchant',
    });
  }

  /** RSA public key (PEM) used to encrypt card data before tokenization. */
  async getTokenizationKey(): Promise<string> {
    const data = await this.request<{
      publicKey?: string;
      public_key?: string;
    }>('/tokens/keys/tokenization', { auth: 'public' });
    const pem = data.publicKey ?? data.public_key;
    if (!pem) throw new WompiError('Tokenization key missing', 500, data);
    return pem;
  }

  createPaymentSource(
    input: CreatePaymentSourceInput,
  ): Promise<WompiPaymentSource> {
    return this.request<WompiPaymentSource>('/payment_sources', {
      method: 'POST',
      auth: 'private',
      body: JSON.stringify({
        type: 'CARD',
        token: input.token,
        customer_email: input.customerEmail,
        acceptance_token: input.acceptanceToken,
        accept_personal_auth: input.acceptPersonalAuth,
      }),
    });
  }

  createTransaction(input: CreateTransactionInput): Promise<WompiTransaction> {
    const currency = input.currency ?? 'COP';
    return this.request<WompiTransaction>('/transactions', {
      method: 'POST',
      auth: 'private',
      body: JSON.stringify({
        amount_in_cents: input.amountInCents,
        currency,
        signature: integritySignature(
          input.reference,
          input.amountInCents,
          currency,
          this.opts.integritySecret,
        ),
        customer_email: input.customerEmail,
        payment_method: { installments: input.installments ?? 1 },
        reference: input.reference,
        payment_source_id: input.paymentSourceId,
        recurrent: input.recurrent ?? true,
      }),
    });
  }

  getTransaction(id: string): Promise<WompiTransaction> {
    return this.request<WompiTransaction>(
      `/transactions/${encodeURIComponent(id)}`,
      { auth: 'private' },
    );
  }
}
