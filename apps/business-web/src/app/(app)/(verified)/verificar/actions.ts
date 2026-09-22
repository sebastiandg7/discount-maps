'use server';

import type { VerifyCouponResult } from '@org/domain';
import { getOwnBusiness, getSession } from '../../../../lib/business';

export type VerifyActionResult =
  { result: VerifyCouponResult } | { error: string };

const MAX_TOKEN_LENGTH = 512;

/**
 * Redeems a consumer's QR token. Postgres decides (signature, expiry, ownership,
 * entitlement, replay) and answers with a reason code; this action only guards
 * the inputs and pins the branch to one the merchant owns.
 */
export async function verifyCouponTokenAction(
  token: string,
  branchId: string | null,
): Promise<VerifyActionResult> {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) {
    return { result: { valid: false, reason: 'MALFORMED' } };
  }
  const { supabase } = await getSession();
  const business = await getOwnBusiness();
  if (!business) return { error: 'No encontramos tu empresa.' };

  let branch: string | null = null;
  if (branchId) {
    const { data } = await supabase
      .from('branches')
      .select('id')
      .eq('business_id', business.id)
      .eq('id', branchId)
      .maybeSingle();
    branch = data?.id ?? null;
  }

  const { data, error } = await supabase.rpc('verify_coupon_token', {
    p_token: token.trim(),
    p_branch_id: branch ?? undefined,
  });
  if (error || !data || typeof data !== 'object') {
    return { error: 'No pudimos verificar el código. Intenta de nuevo.' };
  }
  return { result: data as VerifyCouponResult };
}
