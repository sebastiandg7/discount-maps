import {
  addMonths,
  applyPaymentOutcome,
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
