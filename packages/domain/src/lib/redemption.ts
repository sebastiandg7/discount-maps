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
