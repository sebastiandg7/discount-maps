import Link from 'next/link';
import {
  canDeactivateCoupon,
  formatDiscount,
  isCouponLive,
  MIN_ACTIVE_COUPONS,
  missingActiveCoupons,
} from '@org/domain';
import {
  BackIcon,
  buttonClassName,
  EmptyState,
  PageShell,
  TopBar,
} from '@org/ui';
import { getOwnBusiness } from '../../../../lib/business';
import { listCoupons } from '../../../../lib/coupons';
import { CouponToggle } from './coupon-toggle';

export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  const business = (await getOwnBusiness())!;
  const { coupons, liveCount } = await listCoupons(business.id);
  const missing = missingActiveCoupons(liveCount);
  const isVerified = business.verification_status === 'verified';

  return (
    <PageShell>
      <TopBar
        title="Cupones"
        left={
          <Link href="/inicio" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
      />

      {missing > 0 ? (
        <p
          role="status"
          className="mb-4 rounded-card bg-brand-50 px-4 py-3 text-sm text-brand-700"
        >
          Necesitas <strong>{missing}</strong>{' '}
          {missing === 1 ? 'cupón activo más' : 'cupones activos más'} para
          aparecer en el mapa. Mínimo {MIN_ACTIVE_COUPONS} activos.
        </p>
      ) : (
        <p
          role="status"
          className="mb-4 rounded-card bg-success/10 px-4 py-3 text-sm text-ink"
        >
          Tienes <strong>{liveCount}</strong> cupones activos. Tu negocio
          aparece en el mapa.
        </p>
      )}

      <Link
        href="/cupones/nuevo"
        className={buttonClassName('primary', 'mb-6 w-full')}
      >
        Crear cupón
      </Link>

      {coupons.length === 0 ? (
        <EmptyState
          title="Aún no tienes cupones"
          description="Crea tu primer cupón con el botón de arriba."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {coupons.map((c) => {
            const live = isCouponLive(c);
            return (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-card border border-line p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{c.title}</p>
                  <p className="text-sm text-brand-600">
                    {formatDiscount(c.discount_type, c.discount_value)}
                  </p>
                  {c.is_active && !live ? (
                    <p className="text-xs text-ink-muted">
                      Fuera de su periodo de validez
                    </p>
                  ) : null}
                  <Link
                    href={`/cupones/${c.id}`}
                    className="mt-2 inline-block text-sm font-semibold text-brand-600"
                  >
                    Editar
                  </Link>
                </div>
                <CouponToggle
                  couponId={c.id}
                  isActive={c.is_active}
                  canDeactivate={
                    !live || canDeactivateCoupon(liveCount, isVerified)
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
