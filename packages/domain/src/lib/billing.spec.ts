import {
  addMonths,
  applyNewPaymentSource,
  applyPaymentOutcome,
  cancelSubscription,
  isChargeDue,
  parsePaymentReference,
  paymentReference,
  planCharge,
  type BillableSubscription,
} from './billing';
import {
  addDays,
  CHARGE_RETRY_DAYS,
  MAX_CHARGE_ATTEMPTS,
} from './subscription';

const NOW = new Date('2026-09-27T12:00:00Z');
const ID = '11111111-2222-4333-8444-555555555555';

function sub(partial: Partial<BillableSubscription>): BillableSubscription {
  return {
    id: ID,
    status: 'trialing',
    trial_ends_at: NOW,
    current_period_end: null,
    next_charge_at: NOW,
    charge_attempts: 0,
    ...partial,
  };
}

describe('addMonths', () => {
  it('adds calendar months and clamps the day', () => {
    expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1)).toEqual(
      new Date('2026-02-28T10:00:00Z'),
    );
    expect(addMonths(new Date('2026-03-15T10:00:00Z'), 1)).toEqual(
      new Date('2026-04-15T10:00:00Z'),
    );
    expect(addMonths(new Date('2026-12-05T10:00:00Z'), 1)).toEqual(
      new Date('2027-01-05T10:00:00Z'),
    );
  });
});

describe('payment references', () => {
  it('round-trips subscription, period start and attempt', () => {
    const ref = paymentReference(ID, NOW, 2);
    expect(ref).toBe(`sub_${ID}_${Math.floor(NOW.getTime() / 1000)}_2`);
    expect(parsePaymentReference(ref)).toEqual({
      subscriptionId: ID,
      periodStart: NOW,
      attempt: 2,
    });
  });

  it('rejects foreign references', () => {
    expect(parsePaymentReference('order-123')).toBeNull();
    expect(parsePaymentReference('sub_x_1_1')).toBeNull();
  });
});

describe('isChargeDue', () => {
  it.each<[string, BillableSubscription, boolean]>([
    ['trial ending now', sub({}), true],
    ['trial ending later', sub({ next_charge_at: addDays(NOW, 1) }), false],
    [
      'active period ended',
      sub({ status: 'active', current_period_end: NOW }),
      true,
    ],
    ['past_due retry due', sub({ status: 'past_due' }), true],
    ['canceled', sub({ status: 'canceled' }), false],
    [
      'attempts exhausted',
      sub({ status: 'past_due', charge_attempts: MAX_CHARGE_ATTEMPTS }),
      false,
    ],
    ['no next charge date', sub({ next_charge_at: null }), false],
  ])('%s', (_label, s, expected) => {
    expect(isChargeDue(s, NOW)).toBe(expected);
  });
});

describe('planCharge', () => {
  it('bills the month after the trial on the first attempt', () => {
    const plan = planCharge(sub({}), NOW);
    expect(plan.attempt).toBe(1);
    expect(plan.periodStart).toEqual(NOW);
    expect(plan.periodEnd).toEqual(addMonths(NOW, 1));
    expect(plan.reference).toBe(paymentReference(ID, NOW, 1));
    expect(plan.nextChargeAt).toEqual(addDays(NOW, CHARGE_RETRY_DAYS));
  });

  it('continues from the current period end on renewals', () => {
    const end = new Date('2026-10-27T12:00:00Z');
    const plan = planCharge(
      sub({ status: 'active', current_period_end: end, charge_attempts: 1 }),
      NOW,
    );
    expect(plan.attempt).toBe(2);
    expect(plan.periodStart).toEqual(end);
    expect(plan.periodEnd).toEqual(addMonths(end, 1));
  });
});

describe('applyPaymentOutcome', () => {
  it('waits on PENDING', () => {
    expect(applyPaymentOutcome(sub({}), 'PENDING', NOW)).toBeNull();
  });

  it('APPROVED activates a month from the anchor and resets attempts', () => {
    const patch = applyPaymentOutcome(
      sub({ status: 'trialing', charge_attempts: 1 }),
      'APPROVED',
      NOW,
    );
    expect(patch).toEqual({
      status: 'active',
      current_period_end: addMonths(NOW, 1),
      next_charge_at: addMonths(NOW, 1),
      charge_attempts: 0,
      canceled_at: null,
    });
  });

  it('APPROVED long after the anchor starts the period today', () => {
    const old = addDays(NOW, -45);
    const patch = applyPaymentOutcome(
      sub({ status: 'past_due', current_period_end: old, charge_attempts: 2 }),
      'APPROVED',
      NOW,
    );
    expect(patch?.current_period_end).toEqual(addMonths(NOW, 1));
  });

  it.each(['DECLINED', 'VOIDED', 'ERROR'] as const)(
    '%s marks past_due and schedules a retry while attempts remain',
    (outcome) => {
      const patch = applyPaymentOutcome(
        sub({ status: 'trialing', charge_attempts: 1 }),
        outcome,
        NOW,
      );
      expect(patch).toEqual({
        status: 'past_due',
        next_charge_at: addDays(NOW, CHARGE_RETRY_DAYS),
      });
    },
  );

  it('cancels after the last allowed attempt fails', () => {
    const patch = applyPaymentOutcome(
      sub({ status: 'past_due', charge_attempts: MAX_CHARGE_ATTEMPTS }),
      'DECLINED',
      NOW,
    );
    expect(patch).toEqual({
      status: 'canceled',
      next_charge_at: null,
      canceled_at: NOW,
    });
  });
});

describe('cancelSubscription', () => {
  it('stops charges and keeps the period end untouched', () => {
    const periodEnd = addDays(NOW, 20);
    const patch = cancelSubscription(
      sub({ status: 'active', current_period_end: periodEnd }),
      NOW,
    );
    expect(patch).toEqual({
      status: 'canceled',
      next_charge_at: null,
      canceled_at: NOW,
    });
  });

  it('is a no-op when already canceled', () => {
    expect(cancelSubscription(sub({ status: 'canceled' }), NOW)).toBeNull();
  });
});

describe('applyNewPaymentSource', () => {
  it('only swaps the card on trialing / active subscriptions', () => {
    expect(applyNewPaymentSource(sub({ status: 'trialing' }), NOW)).toBeNull();
    expect(
      applyNewPaymentSource(
        sub({ status: 'active', current_period_end: addDays(NOW, 10) }),
        NOW,
      ),
    ).toBeNull();
  });

  it('resets attempts and makes a past_due subscription due now', () => {
    expect(
      applyNewPaymentSource(
        sub({ status: 'past_due', charge_attempts: 2 }),
        NOW,
      ),
    ).toEqual({ status: 'past_due', next_charge_at: NOW, charge_attempts: 0 });
  });

  it('reactivates a canceled subscription with time left as active', () => {
    const periodEnd = addDays(NOW, 12);
    expect(
      applyNewPaymentSource(
        sub({
          status: 'canceled',
          current_period_end: periodEnd,
          charge_attempts: 3,
        }),
        NOW,
      ),
    ).toEqual({
      status: 'active',
      next_charge_at: periodEnd,
      charge_attempts: 0,
      canceled_at: null,
    });
  });

  it('reactivates a canceled trial with time left as trialing', () => {
    const trialEnd = addDays(NOW, 3);
    expect(
      applyNewPaymentSource(
        sub({ status: 'canceled', trial_ends_at: trialEnd }),
        NOW,
      ),
    ).toEqual({
      status: 'trialing',
      next_charge_at: trialEnd,
      charge_attempts: 0,
      canceled_at: null,
    });
  });

  it('makes an expired canceled subscription past_due and due now', () => {
    expect(
      applyNewPaymentSource(
        sub({
          status: 'canceled',
          trial_ends_at: addDays(NOW, -40),
          current_period_end: addDays(NOW, -10),
          charge_attempts: 3,
        }),
        NOW,
      ),
    ).toEqual({
      status: 'past_due',
      next_charge_at: NOW,
      charge_attempts: 0,
      canceled_at: null,
    });
  });
});

describe('planCharge after a card update', () => {
  it('keeps the attempt count but skips references already used this period', () => {
    const s = sub({ status: 'past_due', charge_attempts: 0 });
    const plan = planCharge(s, NOW, 3);
    expect(plan.attempt).toBe(1);
    expect(plan.reference).toBe(paymentReference(ID, NOW, 4));
    expect(planCharge(s, NOW, 0).reference).toBe(paymentReference(ID, NOW, 1));
  });
});
