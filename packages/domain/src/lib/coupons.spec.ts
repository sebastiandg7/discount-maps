import {
  canDeactivateCoupon,
  couponScore,
  formatDiscount,
  isCouponLive,
  missingActiveCoupons,
} from './coupons';

const NOW = new Date('2026-09-20T12:00:00Z');

describe('isCouponLive', () => {
  it('inactive is never live', () => {
    expect(isCouponLive({ is_active: false }, NOW)).toBe(false);
  });
  it('active without a window is live', () => {
    expect(isCouponLive({ is_active: true }, NOW)).toBe(true);
  });
  it('respects valid_from', () => {
    expect(
      isCouponLive(
        { is_active: true, valid_from: '2026-09-21T00:00:00Z' },
        NOW,
      ),
    ).toBe(false);
    expect(
      isCouponLive(
        { is_active: true, valid_from: '2026-09-19T00:00:00Z' },
        NOW,
      ),
    ).toBe(true);
  });
  it('respects valid_until (exclusive)', () => {
    expect(isCouponLive({ is_active: true, valid_until: NOW }, NOW)).toBe(
      false,
    );
    expect(
      isCouponLive(
        { is_active: true, valid_until: '2026-09-21T00:00:00Z' },
        NOW,
      ),
    ).toBe(true);
  });
});

describe('couponScore', () => {
  it.each([
    ['percentage', 20, 20],
    ['percentage', 150, 100],
    ['fixed', 20_000, 50],
    ['fixed', 80_000, 100],
    ['bogo', null, 50],
    ['other', 99, 0],
  ] as const)('%s %s → %s', (type, value, expected) => {
    expect(couponScore(type, value)).toBe(expected);
  });
});

describe('canDeactivateCoupon', () => {
  it('unverified businesses may always deactivate', () => {
    expect(canDeactivateCoupon(1, false)).toBe(true);
  });
  it('verified businesses must keep 3 live coupons', () => {
    expect(canDeactivateCoupon(3, true)).toBe(false);
    expect(canDeactivateCoupon(4, true)).toBe(true);
  });
});

describe('missingActiveCoupons', () => {
  it('counts up to the minimum and never below zero', () => {
    expect(missingActiveCoupons(0)).toBe(3);
    expect(missingActiveCoupons(2)).toBe(1);
    expect(missingActiveCoupons(5)).toBe(0);
  });
});

describe('formatDiscount', () => {
  it('formats each type in es-CO', () => {
    expect(formatDiscount('percentage', 15)).toBe('15 % de descuento');
    expect(formatDiscount('fixed', 10_000)).toMatch(/10\.000\s*de descuento/);
    expect(formatDiscount('bogo', null)).toBe('2 x 1');
    expect(formatDiscount('other', null)).toBe('Promoción especial');
  });
});
