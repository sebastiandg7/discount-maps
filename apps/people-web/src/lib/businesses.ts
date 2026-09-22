import 'server-only';

import { isCouponLive } from '@org/domain';
import { publicStorageUrl, type Tables, type Views } from '@org/supabase';
import { getSession, isUuid } from './session';

export type PublicBusiness = Views<'businesses_public'>;
export type BranchWithCoords = Views<'branches_with_coords'>;
export type Coupon = Tables<'coupons'>;

/** A business as the consumer map sees it (verified and >= 3 live coupons), or null. */
export async function getPublicBusiness(
  id: string,
): Promise<PublicBusiness | null> {
  if (!isUuid(id)) return null;
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('businesses_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ?? null;
}

export async function listBranches(
  businessId: string,
): Promise<BranchWithCoords[]> {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('branches_with_coords')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at');
  return data ?? [];
}

/** Live coupons only. RLS already hides the rest from consumers; the filter is defensive. */
export async function listLiveCoupons(businessId: string): Promise<Coupon[]> {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return (data ?? []).filter((c) => isCouponLive(c));
}

export async function getLiveCoupon(
  businessId: string,
  couponId: string,
): Promise<Coupon | null> {
  if (!isUuid(couponId)) return null;
  const { supabase } = await getSession();
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', couponId)
    .maybeSingle();
  return data && isCouponLive(data) ? data : null;
}

export function logoUrl(path: string | null | undefined): string | null {
  return publicStorageUrl('logos', path);
}

export function couponImageUrl(path: string | null | undefined): string | null {
  return publicStorageUrl('coupon-images', path);
}
