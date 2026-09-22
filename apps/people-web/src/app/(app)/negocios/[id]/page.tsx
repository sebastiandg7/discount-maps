import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryLabel } from '@org/domain';
import { BusinessMap, googleMapsDirectionsUrl, wazeUrl } from '@org/maps';
import {
  BackIcon,
  buttonClassName,
  CouponCard,
  EmptyState,
  PageShell,
  TopBar,
} from '@org/ui';
import {
  couponImageUrl,
  getPublicBusiness,
  listBranches,
  listLiveCoupons,
  logoUrl,
} from '../../../../lib/businesses';
import { getSession } from '../../../../lib/session';
import { NotifyToggle } from './notify-toggle';

export const dynamic = 'force-dynamic';

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await getPublicBusiness(id);
  if (!business || !business.id) notFound();
  const { supabase, userId } = await getSession();
  const [branches, coupons, follow] = await Promise.all([
    listBranches(business.id),
    listLiveCoupons(business.id),
    userId
      ? supabase
          .from('business_followers')
          .select('notify')
          .eq('consumer_id', userId)
          .eq('business_id', business.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const following = follow.data?.notify === true;
  const located = branches.filter(
    (b): b is typeof b & { lat: number; lng: number } =>
      b.lat != null && b.lng != null,
  );
  const displayName = business.display_name ?? 'Negocio';
  const logo = logoUrl(business.logo_path);

  return (
    <PageShell>
      <TopBar
        title={displayName}
        left={
          <Link href="/mapas" aria-label="Volver" className="text-ink">
            <BackIcon />
          </Link>
        }
        right={
          <NotifyToggle
            businessId={business.id}
            initialFollowing={following}
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null}
          />
        }
      />

      <header className="mb-4 flex items-center gap-3">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-surface-muted text-2xl font-semibold text-ink-muted">
            {displayName.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-ink">{displayName}</h2>
          {business.category ? (
            <p className="text-sm text-ink-muted">
              {categoryLabel(business.category)}
            </p>
          ) : null}
        </div>
      </header>
      {business.description ? (
        <p className="mb-4 text-sm text-ink">{business.description}</p>
      ) : null}

      <BusinessMap
        center={
          located[0]
            ? { lat: located[0].lat, lng: located[0].lng }
            : { lat: 4.711, lng: -74.0721 }
        }
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null}
        markers={located.map((b) => ({
          id: b.id ?? '',
          lat: b.lat,
          lng: b.lng,
          label: b.name ?? displayName,
        }))}
        className="mb-6"
      />

      <section aria-labelledby="sedes" className="mb-6">
        <h3 id="sedes" className="mb-2 text-lg font-semibold text-ink">
          Sedes
        </h3>
        {branches.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin sedes registradas.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {branches.map((b) => (
              <li
                key={b.id}
                className="rounded-card border border-line bg-surface p-4"
              >
                <p className="font-semibold text-ink">{b.name}</p>
                <p className="text-sm text-ink-muted">
                  {b.address_line}
                  {b.city ? `, ${b.city}` : ''}
                </p>
                {b.phone ? (
                  <a
                    href={`tel:${b.phone}`}
                    className="text-sm font-medium text-brand-600"
                  >
                    {b.phone}
                  </a>
                ) : null}
                {b.lat != null && b.lng != null ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a
                      href={googleMapsDirectionsUrl(
                        b.lat,
                        b.lng,
                        b.google_place_id,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClassName(
                        'secondary',
                        'px-3 py-2 text-sm',
                      )}
                    >
                      Cómo llegar
                    </a>
                    <a
                      href={wazeUrl(b.lat, b.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClassName(
                        'secondary',
                        'px-3 py-2 text-sm',
                      )}
                    >
                      Waze
                    </a>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cupones">
        <h3 id="cupones" className="mb-2 text-lg font-semibold text-ink">
          Cupones
        </h3>
        {coupons.length === 0 ? (
          <EmptyState title="Sin cupones activos" />
        ) : (
          <ul className="flex flex-col gap-4">
            {coupons.map((c) => (
              <li key={c.id}>
                <CouponCard
                  href={`/negocios/${business.id}/cupones/${c.id}`}
                  business={{ display_name: displayName, logo_url: logo }}
                  coupon={{
                    title: c.title,
                    description: c.description,
                    discount_type: c.discount_type,
                    discount_value: c.discount_value,
                    image_url: couponImageUrl(c.image_path),
                    valid_until: c.valid_until,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
