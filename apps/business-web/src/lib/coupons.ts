import 'server-only';

import { isCouponLive } from '@org/domain';
import { publicStorageUrl, type Tables } from '@org/supabase';
import { getSession } from './business';

export type Coupon = Tables<'coupons'>;

/** All coupons of a business, newest first, plus the live count. */
export async function listCoupons(businessId: string) {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  const coupons = data ?? [];
  const liveCount = coupons.filter((c) => isCouponLive(c)).length;
  return { coupons, liveCount };
}

export async function getCoupon(
  businessId: string,
  couponId: string,
): Promise<Coupon | null> {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', couponId)
    .maybeSingle();
  return data ?? null;
}

export function couponImageUrl(path: string | null | undefined): string | null {
  return publicStorageUrl('coupon-images', path);
}
