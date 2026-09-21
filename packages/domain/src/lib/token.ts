/**
 * Coupon QR token format. Tokens are minted and verified in Postgres
 * (`issue_coupon_token` / `verify_coupon_token`); the client only parses them
 * to show a countdown and detect stale codes before the merchant scans.
 *
 * Format: dm1.<consumer_uuid>.<coupon_uuid>.<exp_epoch>.<jti_hex16>.<hmac_sha256_hex>
 */

export const COUPON_TOKEN_PREFIX = 'dm1';
/** Server-side lifetime of a token. */
export const COUPON_TOKEN_TTL_SECONDS = 90;
/** How often the consumer screen requests a fresh token. */
export const COUPON_TOKEN_REFRESH_SECONDS = 60;

export interface CouponToken {
  consumerId: string;
  couponId: string;
  expiresAt: Date;
  jti: string;
  signature: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_RE = /^[0-9a-f]+$/i;

/** Structural parse only. Does NOT verify the signature. */
export function parseCouponToken(token: string): CouponToken | null {
  const parts = token.split('.');
  if (parts.length !== 6 || parts[0] !== COUPON_TOKEN_PREFIX) return null;
  const [, consumerId, couponId, exp, jti, signature] = parts;
  if (!UUID_RE.test(consumerId) || !UUID_RE.test(couponId)) return null;
  if (!/^\d+$/.test(exp)) return null;
  if (jti.length !== 16 || !HEX_RE.test(jti)) return null;
  if (signature.length !== 64 || !HEX_RE.test(signature)) return null;
  return {
    consumerId,
    couponId,
    expiresAt: new Date(Number(exp) * 1000),
    jti,
    signature,
  };
}

export function isCouponTokenExpired(
  token: CouponToken,
  now: Date = new Date(),
): boolean {
  return token.expiresAt.getTime() <= now.getTime();
}

/** Whole seconds left before the token expires (never negative). */
export function couponTokenSecondsLeft(
  token: CouponToken,
  now: Date = new Date(),
): number {
  return Math.max(
    0,
    Math.floor((token.expiresAt.getTime() - now.getTime()) / 1000),
  );
}
