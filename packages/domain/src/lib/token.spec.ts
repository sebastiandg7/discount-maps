import {
  couponTokenSecondsLeft,
  isCouponTokenExpired,
  parseCouponToken,
} from './token';

const CONSUMER = '11111111-2222-4333-8444-555555555555';
const COUPON = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const EXP = 1_790_000_000; // 2026-09-21T10:13:20Z
const JTI = 'abcdef0123456789';
const SIG = 'f'.repeat(64);
const TOKEN = `dm1.${CONSUMER}.${COUPON}.${EXP}.${JTI}.${SIG}`;

describe('parseCouponToken', () => {
  it('parses a well-formed token', () => {
    expect(parseCouponToken(TOKEN)).toEqual({
      consumerId: CONSUMER,
      couponId: COUPON,
      expiresAt: new Date(EXP * 1000),
      jti: JTI,
      signature: SIG,
    });
  });

  it.each([
    ['wrong prefix', TOKEN.replace('dm1', 'dm2')],
    ['missing part', TOKEN.split('.').slice(0, 5).join('.')],
    ['bad uuid', TOKEN.replace(CONSUMER, 'not-a-uuid')],
    ['non-numeric exp', TOKEN.replace(String(EXP), 'soon')],
    ['short jti', TOKEN.replace(JTI, 'abc')],
    ['short signature', TOKEN.replace(SIG, 'ff')],
    ['empty', ''],
  ])('rejects %s', (_label, token) => {
    expect(parseCouponToken(token)).toBeNull();
  });
});

describe('expiry helpers', () => {
  const parsed = parseCouponToken(TOKEN);
  if (!parsed) throw new Error('fixture token must parse');
  const token = parsed;
  it('reports expiry relative to now', () => {
    expect(isCouponTokenExpired(token, new Date((EXP - 10) * 1000))).toBe(
      false,
    );
    expect(isCouponTokenExpired(token, new Date(EXP * 1000))).toBe(true);
  });
  it('counts seconds left, floored at zero', () => {
    expect(couponTokenSecondsLeft(token, new Date((EXP - 42) * 1000))).toBe(42);
    expect(couponTokenSecondsLeft(token, new Date((EXP + 5) * 1000))).toBe(0);
  });
});
