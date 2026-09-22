/**
 * Pure push fan-out. Given stored subscriptions and a sender, returns what was
 * delivered and which endpoints the push service reports as gone (404 / 410)
 * so the caller can delete them. No IO of its own; testable without web-push.
 */

export interface StoredPushSubscription {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface PushSendError {
  statusCode?: number;
  message?: string;
}

export type PushSender = (
  subscription: StoredPushSubscription,
  payload: PushPayload,
) => Promise<void>;

export interface DispatchResult {
  sent: number;
  failed: number;
  /** Subscription ids the push service no longer knows (delete them). */
  stale: string[];
}

const GONE_STATUSES = new Set([404, 410]);

export function isStoredPushSubscription(row: {
  id: string;
  endpoint: string;
  keys: unknown;
}): row is StoredPushSubscription {
  const keys = row.keys as { p256dh?: unknown; auth?: unknown } | null;
  return (
    typeof row.endpoint === 'string' &&
    !!keys &&
    typeof keys.p256dh === 'string' &&
    typeof keys.auth === 'string'
  );
}

export async function dispatchPush(
  subscriptions: readonly StoredPushSubscription[],
  payload: PushPayload,
  send: PushSender,
): Promise<DispatchResult> {
  const result: DispatchResult = { sent: 0, failed: 0, stale: [] };
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await send(subscription, payload);
        result.sent++;
      } catch (error) {
        const status = (error as PushSendError)?.statusCode;
        if (status !== undefined && GONE_STATUSES.has(status)) {
          result.stale.push(subscription.id);
        } else {
          result.failed++;
        }
      }
    }),
  );
  return result;
}

/** Notification copy for a freshly published coupon. */
export function newCouponPayload(input: {
  businessId: string;
  businessName: string;
  couponId: string;
  couponTitle: string;
}): PushPayload {
  return {
    title: input.businessName,
    body: `Nuevo cupón: ${input.couponTitle}`,
    url: `/negocios/${input.businessId}/cupones/${input.couponId}`,
    tag: `coupon-${input.couponId}`,
  };
}
