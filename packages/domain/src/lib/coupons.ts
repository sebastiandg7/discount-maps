/**
 * Coupon rules. Mirrors `public.coupon_is_live()`, `public.coupon_score()` and the
 * `coupons_min_active` trigger in supabase/migrations — keep both in sync.
 */

export type DiscountType = 'percentage' | 'fixed' | 'bogo' | 'other';

/** A verified business must keep at least this many live coupons to stay on the map. */
export const MIN_ACTIVE_COUPONS = 3;
/** Reference ticket used to score fixed-amount discounts against percentages. */
export const FIXED_DISCOUNT_REFERENCE_TICKET_COP = 40_000;

export interface CouponLike {
  is_active: boolean;
  valid_from?: string | Date | null;
  valid_until?: string | Date | null;
}

function toTime(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  return (value instanceof Date ? value : new Date(value)).getTime();
}

/** Active and inside its validity window. */
export function isCouponLive(c: CouponLike, now: Date = new Date()): boolean {
  if (!c.is_active) return false;
  const from = toTime(c.valid_from);
  const until = toTime(c.valid_until);
  const t = now.getTime();
  return (from === null || from <= t) && (until === null || until > t);
}

/** 0..100 score used by the "Los mejores descuentos" sort. */
export function couponScore(
  type: DiscountType,
  value: number | null | undefined,
): number {
  const v = value ?? 0;
  switch (type) {
    case 'percentage':
      return Math.min(v, 100);
    case 'fixed':
      return Math.min((v / FIXED_DISCOUNT_REFERENCE_TICKET_COP) * 100, 100);
    case 'bogo':
      return 50;
    default:
      return 0;
  }
}

/**
 * Whether one live coupon can be deactivated/deleted given the current live count.
 * Pending (unverified) businesses can always deactivate; verified ones must keep the minimum.
 */
export function canDeactivateCoupon(
  liveCount: number,
  isVerified: boolean,
): boolean {
  if (!isVerified) return true;
  return liveCount - 1 >= MIN_ACTIVE_COUPONS;
}

/** How many more live coupons the business needs before it appears on the map. */
export function missingActiveCoupons(liveCount: number): number {
  return Math.max(0, MIN_ACTIVE_COUPONS - liveCount);
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatCop(value: number): string {
  return copFormatter.format(value);
}

/** Short es-CO headline for a coupon, e.g. "20 % de descuento". */
export function formatDiscount(
  type: DiscountType,
  value: number | null | undefined,
): string {
  switch (type) {
    case 'percentage':
      return `${value ?? 0} % de descuento`;
    case 'fixed':
      return `${formatCop(value ?? 0)} de descuento`;
    case 'bogo':
      return '2 x 1';
    default:
      return 'Promoción especial';
  }
}

export const discountTypeLabels: Record<DiscountType, string> = {
  percentage: 'Porcentaje',
  fixed: 'Monto fijo',
  bogo: '2 x 1',
  other: 'Otra promoción',
};

/** Postgres error message raised by the `coupons_min_active` trigger. */
export const MIN_ACTIVE_COUPONS_ERROR = 'MIN_ACTIVE_COUPONS';
