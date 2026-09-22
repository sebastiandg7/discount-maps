/**
 * Billing rules: when a subscription is charged, how a payment outcome moves it
 * between states, and how payment references are built. Consumed by
 * people-web's /api/billing/run and /api/wompi/webhook; no IO here.
 */

import {
  addDays,
  CHARGE_RETRY_DAYS,
  MAX_CHARGE_ATTEMPTS,
  subscriptionAccessUntil,
  type SubscriptionLike,
  type SubscriptionStatus,
} from './subscription';

export const SUBSCRIPTION_PERIOD_MONTHS = 1;
export const PAYMENT_REFERENCE_PREFIX = 'sub';
export const PAYMENT_CURRENCY = 'COP';

/** Final Wompi transaction states plus the one that means "wait". */
export type PaymentOutcome =
  'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export const CHARGEABLE_STATUSES: readonly SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
];

export interface BillableSubscription extends SubscriptionLike {
  id: string;
  next_charge_at: string | Date | null;
  charge_attempts: number;
}

export interface SubscriptionPatch {
  status: SubscriptionStatus;
  current_period_end?: Date | null;
  next_charge_at: Date | null;
  charge_attempts?: number;
  canceled_at?: Date | null;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

/** Calendar months later, clamping the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/** Where the next paid period starts: the end of the current one, or the trial end. */
export function periodAnchor(s: SubscriptionLike): Date {
  const end = toDate(s.current_period_end) ?? toDate(s.trial_ends_at);
  if (!end) throw new Error('subscription has no trial_ends_at');
  return end;
}

/** `sub_<subscription id>_<period start epoch seconds>_<attempt>` (unique per attempt). */
export function paymentReference(
  subscriptionId: string,
  periodStart: Date,
  attempt: number,
): string {
  return `${PAYMENT_REFERENCE_PREFIX}_${subscriptionId}_${Math.floor(
    periodStart.getTime() / 1000,
  )}_${attempt}`;
}

export interface ParsedPaymentReference {
  subscriptionId: string;
  periodStart: Date;
  attempt: number;
}

export function parsePaymentReference(
  reference: string,
): ParsedPaymentReference | null {
  const m = /^sub_([0-9a-f-]{36})_(\d+)_(\d+)$/i.exec(reference);
  if (!m) return null;
  return {
    subscriptionId: m[1],
    periodStart: new Date(Number(m[2]) * 1000),
    attempt: Number(m[3]),
  };
}

/** True when the billing run should create a charge for this subscription now. */
export function isChargeDue(
  s: BillableSubscription,
  now: Date = new Date(),
): boolean {
  if (!CHARGEABLE_STATUSES.includes(s.status)) return false;
  if (s.charge_attempts >= MAX_CHARGE_ATTEMPTS) return false;
  const next = toDate(s.next_charge_at);
  return next !== null && next.getTime() <= now.getTime();
}

export interface ChargePlan {
  attempt: number;
  periodStart: Date;
  periodEnd: Date;
  reference: string;
  /** When to look again if no outcome arrives (retry cadence). */
  nextChargeAt: Date;
}

/**
 * What the billing run records before asking Wompi for the money.
 * `priorPayments` is how many payments already exist for this period: after a
 * card update resets `charge_attempts`, the reference must not collide with
 * the earlier attempts (references are unique per payment).
 */
export function planCharge(
  s: BillableSubscription,
  now: Date = new Date(),
  priorPayments = 0,
): ChargePlan {
  const attempt = s.charge_attempts + 1;
  const periodStart = periodAnchor(s);
  return {
    attempt,
    periodStart,
    periodEnd: addMonths(periodStart, SUBSCRIPTION_PERIOD_MONTHS),
    reference: paymentReference(
      s.id,
      periodStart,
      Math.max(attempt, priorPayments + 1),
    ),
    nextChargeAt: addDays(now, CHARGE_RETRY_DAYS),
  };
}

/**
 * Subscription changes implied by a payment outcome, or null when nothing
 * changes yet (PENDING). Mirrors the rules in mvp-plan § 4 "Billing".
 */
export function applyPaymentOutcome(
  s: BillableSubscription,
  outcome: PaymentOutcome,
  now: Date = new Date(),
): SubscriptionPatch | null {
  if (outcome === 'PENDING') return null;
  if (outcome === 'APPROVED') {
    let periodEnd = addMonths(periodAnchor(s), SUBSCRIPTION_PERIOD_MONTHS);
    if (periodEnd.getTime() <= now.getTime()) {
      periodEnd = addMonths(now, SUBSCRIPTION_PERIOD_MONTHS);
    }
    return {
      status: 'active',
      current_period_end: periodEnd,
      next_charge_at: periodEnd,
      charge_attempts: 0,
      canceled_at: null,
    };
  }
  // DECLINED / VOIDED / ERROR
  if (s.charge_attempts >= MAX_CHARGE_ATTEMPTS) {
    return { status: 'canceled', next_charge_at: null, canceled_at: now };
  }
  return {
    status: 'past_due',
    next_charge_at: addDays(now, CHARGE_RETRY_DAYS),
  };
}

export const paymentOutcomeLabels: Record<PaymentOutcome, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  DECLINED: 'Rechazado',
  VOIDED: 'Anulado',
  ERROR: 'Error',
};

/**
 * "Cancelar suscripción": no more charges, access continues until
 * `subscriptionAccessUntil` (period end or trial end, see SQL
 * `subscription_access_until`). Null when already canceled.
 */
export function cancelSubscription(
  s: BillableSubscription,
  now: Date = new Date(),
): SubscriptionPatch | null {
  if (s.status === 'canceled') return null;
  return { status: 'canceled', next_charge_at: null, canceled_at: now };
}

/**
 * "Actualizar tarjeta": what changes besides the payment source. Trialing and
 * active subscriptions only swap the card (null). A past_due one gets its
 * attempts reset and becomes due immediately. A canceled one is reactivated:
 * with time left it goes back to trialing/active and is charged at the end of
 * that period, otherwise it becomes past_due and due immediately.
 */
export function applyNewPaymentSource(
  s: BillableSubscription,
  now: Date = new Date(),
): SubscriptionPatch | null {
  if (s.status === 'trialing' || s.status === 'active') return null;
  if (s.status === 'past_due') {
    return { status: 'past_due', next_charge_at: now, charge_attempts: 0 };
  }
  const until = subscriptionAccessUntil(s);
  if (until && until.getTime() > now.getTime()) {
    const trialEnd = toDate(s.trial_ends_at);
    const inTrial =
      s.current_period_end == null &&
      trialEnd !== null &&
      trialEnd.getTime() > now.getTime();
    return {
      status: inTrial ? 'trialing' : 'active',
      next_charge_at: until,
      charge_attempts: 0,
      canceled_at: null,
    };
  }
  return {
    status: 'past_due',
    next_charge_at: now,
    charge_attempts: 0,
    canceled_at: null,
  };
}
