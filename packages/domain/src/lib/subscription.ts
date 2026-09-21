/**
 * Subscription entitlement rules. Mirrors `public.subscription_access_until()` in
 * supabase/migrations — keep both in sync.
 */

export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'canceled';

export interface SubscriptionLike {
  status: SubscriptionStatus;
  trial_ends_at: string | Date;
  current_period_end: string | Date | null;
}

/** Days of free usage before the first charge. */
export const TRIAL_DAYS = 7;
/** Days a past_due subscription keeps access while we retry the card. */
export const PAST_DUE_GRACE_DAYS = 5;
/** Charge attempts before a subscription is canceled. */
export const MAX_CHARGE_ATTEMPTS = 3;
/** Days between charge attempts. */
export const CHARGE_RETRY_DAYS = 2;

const DAY_MS = 86_400_000;

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** When access ends for the given subscription, or null when it cannot be derived. */
export function subscriptionAccessUntil(s: SubscriptionLike): Date | null {
  const trialEnd = toDate(s.trial_ends_at);
  const periodEnd = toDate(s.current_period_end);
  switch (s.status) {
    case 'trialing':
      return trialEnd;
    case 'active':
      return periodEnd;
    case 'past_due': {
      const base = periodEnd ?? trialEnd;
      return base ? addDays(base, PAST_DUE_GRACE_DAYS) : null;
    }
    case 'canceled':
      return periodEnd ?? trialEnd;
  }
}

/** True while the consumer may redeem coupons. */
export function isEntitled(
  s: SubscriptionLike | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!s) return false;
  const until = subscriptionAccessUntil(s);
  return until !== null && until.getTime() > now.getTime();
}

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  trialing: 'Periodo de prueba',
  active: 'Activa',
  past_due: 'Pago pendiente',
  canceled: 'Cancelada',
};
