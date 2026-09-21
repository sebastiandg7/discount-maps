import { render, screen } from '@testing-library/react';
import { CouponCard } from './coupon-card';

describe('CouponCard', () => {
  it('renders the percentage headline, title and business', () => {
    render(
      <CouponCard
        coupon={{
          title: 'Martes de pizza',
          discount_type: 'percentage',
          discount_value: 20,
        }}
        business={{ display_name: 'Pizzas del Norte' }}
      />,
    );
    expect(screen.getByText('20 % de descuento')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Martes de pizza' }),
    ).toBeTruthy();
    expect(screen.getByText('Pizzas del Norte')).toBeTruthy();
  });

  it('renders a fixed amount in COP and the validity date', () => {
    render(
      <CouponCard
        coupon={{
          title: 'Postre gratis',
          discount_type: 'fixed',
          discount_value: 10000,
          valid_until: '2026-12-31T23:59:00Z',
        }}
      />,
    );
    expect(screen.getByText(/10\.000\s*de descuento/)).toBeTruthy();
    expect(screen.getByText(/Válido hasta/)).toBeTruthy();
  });

  it('shows the preview badge and a placeholder title while editing', () => {
    render(
      <CouponCard preview coupon={{ title: '', discount_type: 'bogo' }} />,
    );
    expect(screen.getByText('Vista previa')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Título del cupón' }),
    ).toBeTruthy();
    expect(screen.getByText('2 x 1')).toBeTruthy();
  });

  it('marks inactive coupons', () => {
    render(
      <CouponCard
        coupon={{ title: 'Viejo', discount_type: 'other', is_active: false }}
      />,
    );
    expect(screen.getByText('Inactivo')).toBeTruthy();
  });

  it('becomes a link when href is given', () => {
    render(
      <CouponCard
        href="/cupones/1"
        coupon={{ title: 'Link', discount_type: 'other' }}
      />,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe('/cupones/1');
  });
});
