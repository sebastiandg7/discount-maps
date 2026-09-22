import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@org/supabase/server';
import { isUuid } from '../../../../lib/session';
import { sendNewCouponNotifications } from '../../../../lib/push';

export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const expected = process.env.PUSH_DISPATCH_SECRET;
  const given = request.headers.get('x-push-secret') ?? '';
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by the `coupons_notify_followers` trigger (pg_net) after a coupon insert. */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: { coupon_id?: unknown; business_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const couponId = body.coupon_id;
  const businessId = body.business_id;
  if (!isUuid(couponId as string) || !isUuid(businessId as string)) {
    return NextResponse.json(
      { error: 'coupon_id and business_id required' },
      { status: 400 },
    );
  }
  const result = await sendNewCouponNotifications(createAdminSupabase(), {
    couponId: couponId as string,
    businessId: businessId as string,
  });
  return NextResponse.json({ ok: true, ...result });
}
