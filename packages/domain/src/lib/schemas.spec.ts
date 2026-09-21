import {
  businessProfileSchema,
  businessSignupSchema,
  couponSchema,
  onboardingSchema,
} from './schemas';

describe('couponSchema', () => {
  const base = {
    title: 'Martes de pizza',
    discountType: 'percentage',
    discountValue: 20,
  };

  it('accepts a valid percentage coupon', () => {
    expect(couponSchema.safeParse(base).success).toBe(true);
  });

  it('requires 1..100 for percentage', () => {
    const r = couponSchema.safeParse({ ...base, discountValue: 120 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(['discountValue']);
  });

  it('requires a positive amount for fixed', () => {
    expect(
      couponSchema.safeParse({
        ...base,
        discountType: 'fixed',
        discountValue: 0,
      }).success,
    ).toBe(false);
    expect(
      couponSchema.safeParse({
        ...base,
        discountType: 'fixed',
        discountValue: 5000,
      }).success,
    ).toBe(true);
  });

  it('bogo needs no value', () => {
    expect(
      couponSchema.safeParse({ title: '2x1 en café', discountType: 'bogo' })
        .success,
    ).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const r = couponSchema.safeParse({
      ...base,
      validFrom: '2026-10-01T00:00:00Z',
      validUntil: '2026-09-01T00:00:00Z',
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(['validUntil']);
  });

  it('rejects titles outside 3..60 chars', () => {
    expect(couponSchema.safeParse({ ...base, title: 'ab' }).success).toBe(
      false,
    );
    expect(
      couponSchema.safeParse({ ...base, title: 'x'.repeat(61) }).success,
    ).toBe(false);
  });
});

describe('businessSignupSchema', () => {
  const base = {
    fullName: 'Ana Pérez',
    email: 'ana@example.com',
    password: 'supersecret',
    legalName: 'Pizzas del Norte S.A.S.',
    displayName: 'Pizzas del Norte',
    nit: '900123456-7',
    category: 'restaurants',
  };

  it('accepts a valid sign-up', () => {
    expect(businessSignupSchema.safeParse(base).success).toBe(true);
  });

  it('validates the NIT format', () => {
    expect(
      businessSignupSchema.safeParse({ ...base, nit: 'abc' }).success,
    ).toBe(false);
    expect(
      businessSignupSchema.safeParse({ ...base, nit: '900123456' }).success,
    ).toBe(true);
  });

  it('rejects unknown categories', () => {
    expect(
      businessSignupSchema.safeParse({ ...base, category: 'gyms' }).success,
    ).toBe(false);
  });
});

describe('businessProfileSchema / onboardingSchema', () => {
  const profile = {
    legalName: 'Pizzas del Norte S.A.S.',
    displayName: 'Pizzas del Norte',
    nit: '900123456-7',
    category: 'restaurants',
    description: '',
    phone: '',
  };
  const branch = {
    name: 'Sede Chapinero',
    addressLine: 'Cra 7 # 60-10',
    city: 'Bogotá',
    lat: 4.6486,
    lng: -74.0628,
    phone: '',
  };

  it('accepts a valid NIT with and without check digit', () => {
    expect(businessProfileSchema.safeParse(profile).success).toBe(true);
    expect(
      businessProfileSchema.safeParse({ ...profile, nit: '900123456' }).success,
    ).toBe(true);
    expect(
      businessProfileSchema.safeParse({ ...profile, nit: 'abc' }).success,
    ).toBe(false);
  });

  it('requires at least one branch with coordinates in range', () => {
    expect(
      onboardingSchema.safeParse({ ...profile, branches: [] }).success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...profile, branches: [branch] }).success,
    ).toBe(true);
    expect(
      onboardingSchema.safeParse({
        ...profile,
        branches: [{ ...branch, lat: 95 }],
      }).success,
    ).toBe(false);
  });
});
