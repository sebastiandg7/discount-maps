import Link from 'next/link';
import { notFound } from 'next/navigation';
import { canDeactivateCoupon, isCouponLive } from '@org/domain';
import { publicStorageUrl } from '@org/supabase';
import { BackIcon, PageShell, TopBar } from '@org/ui';
import { getOwnBusiness } from '../../../../../lib/business';
import {
  couponImageUrl,
  getCoupon,
  listCoupons,
} from '../../../../../lib/coupons';
import { CouponForm } from '../coupon-form';

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = (await getOwnBusiness())!;
  const coupon = await getCoupon(business.id, id);
  if (!coupon) notFound();
  const { liveCount } = await listCoupons(business.id);
  const canDeactivate =
    !isCouponLive(coupon) ||
    canDeactivateCoupon(liveCount, business.verification_status === 'verified');

  return (
    <PageShell>
      <TopBar
        title="Editar cupón"
        left={
          <Link href="/cupones" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
      />
      <CouponForm
        business={{
          display_name: business.display_name,
          logo_url: publicStorageUrl('logos', business.logo_path),
        }}
        coupon={{
          id: coupon.id,
          title: coupon.title,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          terms: coupon.terms,
          image_url: couponImageUrl(coupon.image_path),
          is_active: coupon.is_active,
          valid_from: coupon.valid_from,
          valid_until: coupon.valid_until,
        }}
        canDeactivate={canDeactivate}
      />
    </PageShell>
  );
}
