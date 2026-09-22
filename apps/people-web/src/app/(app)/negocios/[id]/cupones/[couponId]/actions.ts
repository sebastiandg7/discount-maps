'use server';

import {
  issueTokenErrorFromMessage,
  issueTokenErrorMessage,
  parseCouponToken,
  type IssueTokenError,
} from '@org/domain';
import { getSession, isUuid } from '../../../../../../lib/session';

export type IssueTokenResult =
  { token: string } | { error: IssueTokenError | 'UNKNOWN'; message: string };

/** Mints a short-lived QR token for the signed-in consumer (Postgres enforces every rule). */
export async function issueCouponTokenAction(
  couponId: string,
): Promise<IssueTokenResult> {
  if (!isUuid(couponId)) {
    return { error: 'UNKNOWN', message: issueTokenErrorMessage(null) };
  }
  const { supabase, userId } = await getSession();
  if (!userId) {
    return {
      error: 'UNAUTHENTICATED',
      message: issueTokenErrorMessage('UNAUTHENTICATED'),
    };
  }
  const { data, error } = await supabase.rpc('issue_coupon_token', {
    p_coupon_id: couponId,
  });
  if (error || typeof data !== 'string' || !parseCouponToken(data)) {
    return {
      error: issueTokenErrorFromMessage(error?.message) ?? 'UNKNOWN',
      message: issueTokenErrorMessage(error?.message),
    };
  }
  return { token: data };
}
