'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { categoryLabel, type BusinessCategory } from '@org/domain';
import { BusinessMap, useGeolocation } from '@org/maps';
import { CategoryChips, EmptyState, FormError, Spinner } from '@org/ui';
import {
  nearbyBusinessesAction,
  type NearbyRow,
  type NearbySort,
} from './actions';

const SORTS: { id: NearbySort; label: string }[] = [
  { id: 'distance', label: 'Más cercanos' },
  { id: 'discount', label: 'Los mejores descuentos' },
];

const km = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${km.format(meters / 1000)} km`;
}

export function NearbyExplorer({
  apiKey,
  mapId,
}: {
  apiKey: string | null;
  mapId: string | null;
}) {
  const geo = useGeolocation();
  const [category, setCategory] = useState<BusinessCategory | null>(null);
  const [sort, setSort] = useState<NearbySort>('distance');
  const [rows, setRows] = useState<NearbyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { lat, lng } = geo.center;
  useEffect(() => {
    startTransition(async () => {
      const result = await nearbyBusinessesAction({
        lat,
        lng,
        category,
        sort,
      });
      if ('error' in result) {
        setError(result.error);
      } else {
        setError(null);
        setRows(result.rows);
      }
    });
  }, [lat, lng, category, sort]);

  return (
    <div className="flex flex-col gap-4">
      <BusinessMap
        center={geo.center}
        apiKey={apiKey}
        mapId={mapId}
        markers={(rows ?? [])
          .filter((r) => r.lat != null && r.lng != null)
          .map((r) => ({
            id: r.branch_id,
            lat: r.lat,
            lng: r.lng,
            label: r.display_name,
            description: `${r.branch_name} · ${formatDistance(r.distance_m)}`,
            href: `/negocios/${r.business_id}`,
          }))}
      />

      {geo.isFallback ? (
        <button
          type="button"
          onClick={geo.locate}
          disabled={geo.status === 'locating'}
          className="inline-flex w-fit items-center gap-2 rounded-pill bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-muted"
        >
          <span aria-hidden="true">📍</span>
          {geo.status === 'locating'
            ? 'Buscando tu ubicación…'
            : 'Ubicación no disponible · Usar mi ubicación'}
        </button>
      ) : null}

      <CategoryChips value={category} onChange={setCategory} />

      <div
        role="group"
        aria-label="Ordenar por"
        className="grid grid-cols-2 gap-2"
      >
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={sort === s.id}
            onClick={() => setSort(s.id)}
            className={`rounded-card border px-3 py-2 text-sm font-medium ${
              sort === s.id
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-line text-ink'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <FormError message={error} />

      {rows === null || (pending && rows.length === 0) ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No hay negocios cerca"
          description="Prueba otra categoría o vuelve más tarde."
        />
      ) : (
        <ul
          className={`flex flex-col gap-3 ${pending ? 'opacity-60' : ''}`}
          aria-busy={pending || undefined}
        >
          {rows.map((r) => (
            <li key={r.branch_id}>
              <Link
                href={`/negocios/${r.business_id}`}
                className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                {r.logo_url ? (
                  <img
                    src={r.logo_url}
                    alt=""
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg font-semibold text-ink-muted">
                    {r.display_name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {r.display_name}
                  </p>
                  <p className="truncate text-sm text-ink-muted">
                    {categoryLabel(r.category)} · {r.branch_name}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {r.address_line}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-brand-600">
                    {formatDistance(r.distance_m)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {r.active_coupon_count}{' '}
                    {r.active_coupon_count === 1 ? 'cupón' : 'cupones'}
                  </p>
                  {sort === 'discount' ? (
                    <p className="text-xs text-ink-muted">
                      Hasta {Math.round(Number(r.best_score))} pts
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
