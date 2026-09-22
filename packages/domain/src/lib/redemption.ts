/** Reason codes returned by `public.verify_coupon_token`. */
export const REDEMPTION_REASONS = [
  'UNAUTHENTICATED',
  'MALFORMED',
  'BAD_SIGNATURE',
  'EXPIRED',
  'WRONG_BUSINESS',
  'COUPON_INACTIVE',
  'SUBSCRIPTION_INACTIVE',
  'ALREADY_REDEEMED',
] as const;

export type RedemptionReason = (typeof REDEMPTION_REASONS)[number];

export const redemptionReasonMessages: Record<RedemptionReason, string> = {
  UNAUTHENTICATED: 'Inicia sesión para verificar clientes.',
  MALFORMED: 'El código no es un cupón de Discount Maps.',
  BAD_SIGNATURE: 'El código no es válido.',
  EXPIRED: 'El código expiró. Pide al cliente que lo actualice.',
  WRONG_BUSINESS: 'Este cupón pertenece a otro negocio.',
  COUPON_INACTIVE: 'Este cupón ya no está activo.',
  SUBSCRIPTION_INACTIVE: 'La suscripción del cliente no está activa.',
  ALREADY_REDEEMED: 'Este código ya fue redimido.',
};

export type VerifyCouponResult =
  | { valid: true; consumer_name: string | null; coupon_title: string }
  | { valid: false; reason: RedemptionReason };

export function redemptionMessage(reason: string): string {
  return (
    redemptionReasonMessages[reason as RedemptionReason] ??
    'No fue posible verificar el cupón.'
  );
}

/**
 * Error codes raised (as Postgres exceptions) by `public.issue_coupon_token`.
 * Unlike `verify_coupon_token`, issuing fails loudly, so the consumer app maps
 * the exception message back to a code.
 */
export const ISSUE_TOKEN_ERRORS = [
  'UNAUTHENTICATED',
  'SUBSCRIPTION_INACTIVE',
  'COUPON_UNAVAILABLE',
  'QR_SECRET_MISSING',
] as const;

export type IssueTokenError = (typeof ISSUE_TOKEN_ERRORS)[number];

export const issueTokenErrorMessages: Record<IssueTokenError, string> = {
  UNAUTHENTICATED: 'Inicia sesión para ver tu código.',
  SUBSCRIPTION_INACTIVE:
    'Tu suscripción no está activa. Actívala para usar tus cupones.',
  COUPON_UNAVAILABLE: 'Este cupón ya no está disponible.',
  QR_SECRET_MISSING:
    'El servicio de códigos no está configurado. Intenta más tarde.',
};

export const ISSUE_TOKEN_FALLBACK_MESSAGE =
  'No pudimos generar tu código. Intenta de nuevo.';

/** Finds a known code inside a Postgres/PostgREST error message. */
export function issueTokenErrorFromMessage(
  message: string | null | undefined,
): IssueTokenError | null {
  if (!message) return null;
  return ISSUE_TOKEN_ERRORS.find((code) => message.includes(code)) ?? null;
}

export function issueTokenErrorMessage(
  message: string | null | undefined,
): string {
  const code = issueTokenErrorFromMessage(message);
  return code ? issueTokenErrorMessages[code] : ISSUE_TOKEN_FALLBACK_MESSAGE;
}
