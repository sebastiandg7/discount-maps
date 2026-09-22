import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackIcon, CouponCard, PageShell, TopBar } from '@org/ui';
import {
  couponImageUrl,
  getLiveCoupon,
  getPublicBusiness,
  logoUrl,
} from '../../../../../../lib/businesses';
import { CouponQr } from './coupon-qr';

export const dynamic = 'force-dynamic';

export default async function CouponPage({
  params,
}: {
  params: Promise<{ id: string; couponId: string }>;
}) {
  const { id, couponId } = await params;
  const business = await getPublicBusiness(id);
  if (!business || !business.id) notFound();
  const coupon = await getLiveCoupon(business.id, couponId);
  if (!coupon) notFound();
  const displayName = business.display_name ?? 'Negocio';

  return (
    <PageShell>
      <TopBar
        title="Cupón"
        left={
          <Link
            href={`/negocios/${business.id}`}
            aria-label="Volver"
            className="text-ink"
          >
            <BackIcon />
          </Link>
        }
      />

      <CouponCard
        business={{
          display_name: displayName,
          logo_url: logoUrl(business.logo_path),
        }}
        coupon={{
          title: coupon.title,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          image_url: couponImageUrl(coupon.image_path),
          valid_until: coupon.valid_until,
        }}
        className="mb-6"
      />

      <section aria-label="Código QR" className="mb-6">
        <CouponQr couponId={coupon.id} />
      </section>

      {coupon.description ? (
        <section className="mb-4">
          <h3 className="mb-1 text-base font-semibold text-ink">Descripción</h3>
          <p className="whitespace-pre-line text-sm text-ink">
            {coupon.description}
          </p>
        </section>
      ) : null}
      {coupon.terms ? (
        <section>
          <h3 className="mb-1 text-base font-semibold text-ink">
            Términos y condiciones
          </h3>
          <p className="whitespace-pre-line text-sm text-ink-muted">
            {coupon.terms}
          </p>
        </section>
      ) : null}
    </PageShell>
  );
}
