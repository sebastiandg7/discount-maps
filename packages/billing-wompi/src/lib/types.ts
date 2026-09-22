/** Wompi REST shapes we rely on (docs.wompi.co, verified 2026-09-22). */

export type WompiTransactionStatus =
  'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export interface WompiTransaction {
  id: string;
  created_at: string;
  finalized_at?: string | null;
  amount_in_cents: number;
  reference: string;
  currency: string;
  customer_email: string | null;
  payment_method_type: string;
  status: WompiTransactionStatus;
  status_message: string | null;
  payment_source_id?: number | null;
  payment_method?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export type WompiPaymentSourceStatus = 'AVAILABLE' | 'PENDING' | 'VOIDED';

export interface WompiPaymentSource {
  id: number;
  type: 'CARD' | 'NEQUI' | 'DAVIPLATA' | 'BANCOLOMBIA_TRANSFER';
  status: WompiPaymentSourceStatus;
  customer_email?: string;
  public_data?: {
    type?: string;
    bin?: string;
    last_four?: string;
    exp_year?: string;
    exp_month?: string;
    card_holder?: string;
    brand?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WompiAcceptanceToken {
  acceptance_token: string;
  permalink: string;
  type: string;
}

export interface WompiAcceptanceTokens {
  presigned_acceptance: WompiAcceptanceToken;
  presigned_personal_data_auth: WompiAcceptanceToken;
}

export interface WompiEvent {
  event: string; // 'transaction.updated'
  data: { transaction?: WompiTransaction; [key: string]: unknown };
  environment: 'test' | 'prod' | string;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  sent_at?: string;
}

export class WompiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'WompiError';
  }
}
