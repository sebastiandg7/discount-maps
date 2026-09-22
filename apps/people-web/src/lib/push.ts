import 'server-only';

import webpush from 'web-push';
import type { AdminSupabase } from '@org/supabase/server';
import {
  dispatchPush,
  isStoredPushSubscription,
  newCouponPayload,
  type DispatchResult,
  type PushSender,
} from './push-dispatch';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in the people-web environment.`);
  return v;
}

let configured = false;

/** web-push sender bound to the VAPID keys from the environment. */
export function webPushSender(): PushSender {
  if (!configured) {
    webpush.setVapidDetails(
      requireEnv('VAPID_SUBJECT'),
      requireEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
      requireEnv('VAPID_PRIVATE_KEY'),
    );
    configured = true;
  }
  return async (subscription, payload) => {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: 'normal' },
    );
  };
}

export type NewCouponPushResult =
  | ({ status: 'sent' } & DispatchResult & { followers: number })
  | { status: 'skipped'; reason: string };

/**
 * Notifies every follower of the coupon's business. Skips coupons that are
 * not live or whose business is not verified. Stale subscriptions (404/410
 * from the push service) are deleted.
 */
export async function sendNewCouponNotifications(
  admin: AdminSupabase,
  input: { couponId: string; businessId: string },
  send: PushSender = webPushSender(),
): Promise<NewCouponPushResult> {
  const { data: coupon } = await admin
    .from('coupons')
    .select('id, title, is_active, valid_from, valid_until, business_id')
    .eq('id', input.couponId)
    .maybeSingle();
  if (!coupon || coupon.business_id !== input.businessId) {
    return { status: 'skipped', reason: 'coupon_not_found' };
  }
  const now = Date.now();
  const live =
    coupon.is_active &&
    (!coupon.valid_from || new Date(coupon.valid_from).getTime() <= now) &&
    (!coupon.valid_until || new Date(coupon.valid_until).getTime() > now);
  if (!live) return { status: 'skipped', reason: 'coupon_not_live' };

  const { data: business } = await admin
    .from('businesses')
    .select('id, display_name, verification_status')
    .eq('id', input.businessId)
    .maybeSingle();
  if (!business || business.verification_status !== 'verified') {
    return { status: 'skipped', reason: 'business_not_verified' };
  }

  const { data: followers } = await admin
    .from('business_followers')
    .select('consumer_id')
    .eq('business_id', business.id)
    .eq('notify', true);
  const consumerIds = (followers ?? []).map((f) => f.consumer_id);
  if (consumerIds.length === 0) {
    return { status: 'sent', sent: 0, failed: 0, stale: [], followers: 0 };
  }

  const { data: rows } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, keys')
    .in('consumer_id', consumerIds);
  const subscriptions = (rows ?? []).filter(isStoredPushSubscription);

  const result = await dispatchPush(
    subscriptions,
    newCouponPayload({
      businessId: business.id,
      businessName: business.display_name,
      couponId: coupon.id,
      couponTitle: coupon.title,
    }),
    send,
  );
  if (result.stale.length) {
    await admin.from('push_subscriptions').delete().in('id', result.stale);
  }
  return { status: 'sent', ...result, followers: consumerIds.length };
}
