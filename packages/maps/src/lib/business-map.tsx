import type { LatLng } from './use-geolocation';

export interface BusinessMapMarker extends LatLng {
  id: string;
  label: string;
}

export interface BusinessMapProps {
  center: LatLng;
  markers?: readonly BusinessMapMarker[];
  /**
   * Google Maps browser key. Apps read `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in a
   * server component and pass it down; without a key the placeholder renders.
   */
  apiKey?: string | null;
  className?: string;
}

/**
 * Map area shared by the consumer list and the business profile.
 *
 * Until the Google Maps key exists this renders a static placeholder with the
 * same props the real map (`@vis.gl/react-google-maps`) will take, so swapping
 * the implementation is local to this file.
 */
export function BusinessMap({
  center,
  markers = [],
  apiKey,
  className = '',
}: BusinessMapProps) {
  const label = apiKey ? 'Mapa' : 'Mapa no disponible';
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line bg-surface-muted text-center ${className}`}
    >
      <span className="text-sm font-medium text-ink-muted">{label}</span>
      <span className="text-xs text-ink-muted">
        {markers.length === 1 ? '1 sede' : `${markers.length} sedes`} ·{' '}
        {center.lat.toFixed(3)}, {center.lng.toFixed(3)}
      </span>
    </div>
  );
}
