'use server';

import type { Json } from '@org/supabase';
import { getSession, isUuid } from '../../../../lib/session';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface FollowResult {
  error?: string;
}

const GENERIC = 'No pudimos guardar tu preferencia. Intenta de nuevo.';

/**
 * Stores the browser's push subscription (one row per endpoint) and marks the
 * business as followed with notifications on. Runs with the user session, so
 * RLS limits both tables to the consumer's own rows.
 */
export async function followBusinessAction(
  businessId: string,
  subscription: PushSubscriptionInput,
  userAgent?: string,
): Promise<FollowResult> {
  const { supabase, userId } = await getSession();
  if (!userId) return { error: 'Inicia sesión para seguir negocios.' };
  if (
    !isUuid(businessId) ||
    typeof subscription?.endpoint !== 'string' ||
    !subscription.endpoint.startsWith('https://') ||
    typeof subscription.keys?.p256dh !== 'string' ||
    typeof subscription.keys?.auth !== 'string'
  ) {
    return { error: GENERIC };
  }
  const { error: pushError } = await supabase.from('push_subscriptions').upsert(
    {
      consumer_id: userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys as unknown as Json,
      user_agent: userAgent?.slice(0, 255) ?? null,
    },
    { onConflict: 'endpoint' },
  );
  if (pushError) return { error: GENERIC };
  const { error: followError } = await supabase
    .from('business_followers')
    .upsert(
      { consumer_id: userId, business_id: businessId, notify: true },
      { onConflict: 'consumer_id,business_id' },
    );
  if (followError) return { error: GENERIC };
  return {};
}

/** Turns notifications off for one business (the push subscription stays for others). */
export async function unfollowBusinessAction(
  businessId: string,
): Promise<FollowResult> {
  const { supabase, userId } = await getSession();
  if (!userId) return { error: 'Inicia sesión para seguir negocios.' };
  if (!isUuid(businessId)) return { error: GENERIC };
  const { error } = await supabase
    .from('business_followers')
    .delete()
    .eq('consumer_id', userId)
    .eq('business_id', businessId);
  if (error) return { error: GENERIC };
  return {};
}
