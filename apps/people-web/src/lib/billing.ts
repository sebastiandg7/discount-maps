import 'server-only';

import { cache } from 'react';
import {
  WompiClient,
  WompiError,
  type WompiTransaction,
  type WompiTransactionStatus,
} from '@org/billing-wompi';
import {
  applyPaymentOutcome,
  isChargeDue,
  MAX_CHARGE_ATTEMPTS,
  PAYMENT_CURRENCY,
  planCharge,
  type BillableSubscription,
  type PaymentOutcome,
} from '@org/domain';
import type { Enums, Json, Tables } from '@org/supabase';
import type { AdminSupabase } from '@org/supabase/server';
import { getSession } from './session';

export type Subscription = Tables<'subscriptions'>;
export type Payment = Tables<'payments'>;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in the people-web environment.`);
  return v;
}

/** Server-side Wompi client built from the environment. */
export function wompiClient(): WompiClient {
  return new WompiClient({
    apiUrl: requireEnv('WOMPI_API_URL'),
    publicKey: requireEnv('NEXT_PUBLIC_WOMPI_PUBLIC_KEY'),
    privateKey: requireEnv('WOMPI_PRIVATE_KEY'),
    integritySecret: requireEnv('WOMPI_INTEGRITY_SECRET'),
  });
}

/** Monthly price in COP cents (SUBSCRIPTION_PRICE_COP is whole pesos). */
export function subscriptionPriceCents(): number {
  const pesos = Number(requireEnv('SUBSCRIPTION_PRICE_COP'));
  if (!Number.isFinite(pesos) || pesos <= 0) {
    throw new Error('SUBSCRIPTION_PRICE_COP must be a positive number.');
  }
  return Math.round(pesos * 100);
}

export function subscriptionPricePesos(): number {
  return Math.round(subscriptionPriceCents() / 100);
}

/** The signed-in consumer's subscription row, or null (memoized per render). */
export const getOwnSubscription = cache(
  async (): Promise<Subscription | null> => {
    const { supabase, userId } = await getSession();
    if (!userId) return null;
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('consumer_id', userId)
      .maybeSingle();
    return data ?? null;
  },
);

const PAYMENT_STATUS: Record<
  WompiTransactionStatus,
  Enums<'payment_status'>
> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
  VOIDED: 'voided',
  ERROR: 'error',
};

export type OutcomeResult =
  'applied' | 'still_pending' | 'already_final' | 'amount_mismatch';

/**
 * Records a Wompi transaction result on its payment row and moves the
 * subscription accordingly. Idempotent: a payment that is already final is
 * left untouched (webhook retries, reconcile overlaps).
 */
export async function recordPaymentOutcome(
  admin: AdminSupabase,
  payment: Payment,
  transaction: Pick<WompiTransaction, 'id' | 'status' | 'amount_in_cents'> & {
    [key: string]: unknown;
  },
  now: Date = new Date(),
): Promise<OutcomeResult> {
  if (payment.status !== 'pending') return 'already_final';
  if (transaction.amount_in_cents !== payment.amount_cents) {
    return 'amount_mismatch';
  }
  const outcome = transaction.status as PaymentOutcome;
  await admin
    .from('payments')
    .update({
      status: PAYMENT_STATUS[transaction.status],
      wompi_transaction_id: transaction.id,
      raw: transaction as unknown as Json,
    })
    .eq('id', payment.id);
  if (outcome === 'PENDING') return 'still_pending';

  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('id', payment.subscription_id)
    .maybeSingle();
  if (!sub) return 'applied';
  const patch = applyPaymentOutcome(sub as BillableSubscription, outcome, now);
  if (patch) {
    await admin
      .from('subscriptions')
      .update({
        status: patch.status,
        next_charge_at: patch.next_charge_at?.toISOString() ?? null,
        ...(patch.current_period_end !== undefined
          ? {
              current_period_end:
                patch.current_period_end?.toISOString() ?? null,
            }
          : {}),
        ...(patch.charge_attempts !== undefined
          ? { charge_attempts: patch.charge_attempts }
          : {}),
        ...(patch.canceled_at !== undefined
          ? { canceled_at: patch.canceled_at?.toISOString() ?? null }
          : {}),
      })
      .eq('id', sub.id);
  }
  return 'applied';
}

export interface BillingRunSummary {
  reconciled: number;
  charged: number;
  failed: number;
  skipped: number;
}

/** Pending payments older than this are re-read from Wompi (lost webhooks). */
const RECONCILE_AFTER_MS = 2 * 60 * 1000;

/** Re-reads pending transactions from Wompi and applies any final status. */
export async function reconcilePendingPayments(
  admin: AdminSupabase,
  wompi: WompiClient,
  now: Date = new Date(),
): Promise<number> {
  const { data: pending } = await admin
    .from('payments')
    .select('*')
    .eq('status', 'pending')
    .not('wompi_transaction_id', 'is', null)
    .lt(
      'created_at',
      new Date(now.getTime() - RECONCILE_AFTER_MS).toISOString(),
    )
    .limit(100);
  let reconciled = 0;
  for (const payment of pending ?? []) {
    try {
      const trx = await wompi.getTransaction(payment.wompi_transaction_id!);
      const result = await recordPaymentOutcome(admin, payment, trx, now);
      if (result === 'applied') reconciled++;
    } catch (error) {
      console.error('[billing] reconcile failed', payment.id, error);
    }
  }
  return reconciled;
}

/** Creates one Wompi charge per due subscription (see mvp-plan § 4 "Billing"). */
export async function chargeDueSubscriptions(
  admin: AdminSupabase,
  wompi: WompiClient,
  now: Date = new Date(),
): Promise<Omit<BillingRunSummary, 'reconciled'>> {
  const summary = { charged: 0, failed: 0, skipped: 0 };
  const { data: due } = await admin
    .from('subscriptions')
    .select('*')
    .in('status', ['trialing', 'active', 'past_due'])
    .lte('next_charge_at', now.toISOString())
    .lt('charge_attempts', MAX_CHARGE_ATTEMPTS)
    .not('wompi_payment_source_id', 'is', null)
    .limit(200);
  if (!due?.length) return summary;

  const { data: openPayments } = await admin
    .from('payments')
    .select('subscription_id')
    .eq('status', 'pending')
    .in(
      'subscription_id',
      due.map((s) => s.id),
    );
  const busy = new Set((openPayments ?? []).map((p) => p.subscription_id));
  const amountCents = subscriptionPriceCents();

  for (const sub of due) {
    if (busy.has(sub.id) || !isChargeDue(sub as BillableSubscription, now)) {
      summary.skipped++;
      continue;
    }
    const plan = planCharge(sub as BillableSubscription, now);
    const { data: payment, error: insertError } = await admin
      .from('payments')
      .insert({
        subscription_id: sub.id,
        reference: plan.reference,
        amount_cents: amountCents,
        currency: PAYMENT_CURRENCY,
        status: 'pending',
        attempt: plan.attempt,
        period_start: plan.periodStart.toISOString(),
        period_end: plan.periodEnd.toISOString(),
      })
      .select('*')
      .single();
    if (insertError || !payment) {
      // Reference already used (a previous run crashed after inserting): leave it to reconcile.
      summary.skipped++;
      continue;
    }
    await admin
      .from('subscriptions')
      .update({
        charge_attempts: plan.attempt,
        next_charge_at: plan.nextChargeAt.toISOString(),
      })
      .eq('id', sub.id);

    try {
      const trx = await wompi.createTransaction({
        amountInCents: amountCents,
        currency: PAYMENT_CURRENCY,
        customerEmail: sub.wompi_customer_email,
        reference: plan.reference,
        paymentSourceId: sub.wompi_payment_source_id!,
      });
      await admin
        .from('payments')
        .update({
          wompi_transaction_id: trx.id,
          raw: trx as unknown as Json,
        })
        .eq('id', payment.id);
      await recordPaymentOutcome(admin, payment, trx, now);
      summary.charged++;
    } catch (error) {
      const body = error instanceof WompiError ? error.body : String(error);
      await admin
        .from('payments')
        .update({ status: 'error', raw: { error: body } as unknown as Json })
        .eq('id', payment.id);
      const patch = applyPaymentOutcome(
        sub as BillableSubscription,
        'ERROR',
        now,
      );
      if (patch) {
        await admin
          .from('subscriptions')
          .update({
            status: patch.status,
            next_charge_at: patch.next_charge_at?.toISOString() ?? null,
            ...(patch.canceled_at !== undefined
              ? { canceled_at: patch.canceled_at?.toISOString() ?? null }
              : {}),
          })
          .eq('id', sub.id);
      }
      console.error('[billing] charge failed', sub.id, body);
      summary.failed++;
    }
  }
  return summary;
}
