import {
  dispatchPush,
  isStoredPushSubscription,
  newCouponPayload,
  type StoredPushSubscription,
} from './push-dispatch';

const sub = (id: string): StoredPushSubscription => ({
  id,
  endpoint: `https://push.example/${id}`,
  keys: { p256dh: 'p', auth: 'a' },
});

const payload = newCouponPayload({
  businessId: 'b1',
  businessName: 'Pizzas del Norte',
  couponId: 'c1',
  couponTitle: 'Martes de pizza',
});

describe('dispatchPush', () => {
  it('counts deliveries and flags 404/410 endpoints as stale', async () => {
    const send = jest.fn(async (s: StoredPushSubscription) => {
      if (s.id === 'gone410') throw { statusCode: 410 };
      if (s.id === 'gone404') throw { statusCode: 404 };
      if (s.id === 'flaky') throw { statusCode: 500 };
      if (s.id === 'network') throw new Error('ECONNRESET');
    });
    const result = await dispatchPush(
      [
        sub('ok1'),
        sub('gone410'),
        sub('ok2'),
        sub('gone404'),
        sub('flaky'),
        sub('network'),
      ],
      payload,
      send,
    );
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(2);
    expect(result.stale.sort()).toEqual(['gone404', 'gone410']);
    expect(send).toHaveBeenCalledTimes(6);
    expect(send).toHaveBeenCalledWith(sub('ok1'), payload);
  });

  it('handles an empty audience', async () => {
    const send = jest.fn();
    expect(await dispatchPush([], payload, send)).toEqual({
      sent: 0,
      failed: 0,
      stale: [],
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('newCouponPayload', () => {
  it('links to the coupon detail with Spanish copy', () => {
    expect(payload).toEqual({
      title: 'Pizzas del Norte',
      body: 'Nuevo cupón: Martes de pizza',
      url: '/negocios/b1/cupones/c1',
      tag: 'coupon-c1',
    });
  });
});

describe('isStoredPushSubscription', () => {
  it('requires both keys', () => {
    expect(
      isStoredPushSubscription({
        id: '1',
        endpoint: 'e',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    ).toBe(true);
    expect(
      isStoredPushSubscription({
        id: '1',
        endpoint: 'e',
        keys: { p256dh: 'p' },
      }),
    ).toBe(false);
    expect(
      isStoredPushSubscription({ id: '1', endpoint: 'e', keys: null }),
    ).toBe(false);
  });
});
