import Link from 'next/link';
import { publicStorageUrl } from '@org/supabase';
import { BackIcon, PageShell, TopBar } from '@org/ui';
import { getOwnBusiness } from '../../../../../lib/business';
import { CouponForm } from '../coupon-form';

export default async function NewCouponPage() {
  const business = (await getOwnBusiness())!;
  return (
    <PageShell>
      <TopBar
        title="Nuevo cupón"
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
        canDeactivate
      />
    </PageShell>
  );
}
