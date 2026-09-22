/// <reference types="google.maps" />
'use client';

import { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import type { LatLng } from './use-geolocation';

export interface BusinessMapMarker extends LatLng {
  id: string;
  label: string;
  /** Second line of the info window (branch name, address…). */
  description?: string;
  /** When set, the info window links here ("Ver cupones"). */
  href?: string;
}

export interface BusinessMapProps {
  center: LatLng;
  markers?: readonly BusinessMapMarker[];
  /**
   * Google Maps browser key. Apps read `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in a
   * server component and pass it down; without a key the placeholder renders.
   */
  apiKey?: string | null;
  /** `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`; enables Advanced Markers (branded pins). */
  mapId?: string | null;
  className?: string;
}

const DEFAULT_ZOOM = 13;
const SINGLE_MARKER_ZOOM = 15;
const FIT_PADDING = 48;

/** Keeps the viewport on the markers (or the center when there are none). */
function Viewport({
  center,
  markers,
}: {
  center: LatLng;
  markers: readonly BusinessMapMarker[];
}) {
  const map = useMap();
  const key = markers.map((m) => `${m.id}:${m.lat},${m.lng}`).join('|');
  useEffect(() => {
    if (!map) return;
    const fit = () => {
      if (markers.length === 0) {
        map.panTo(center);
        map.setZoom(DEFAULT_ZOOM);
        return;
      }
      if (markers.length === 1) {
        map.panTo({ lat: markers[0].lat, lng: markers[0].lng });
        map.setZoom(SINGLE_MARKER_ZOOM);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      for (const m of markers) bounds.extend({ lat: m.lat, lng: m.lng });
      map.fitBounds(bounds, FIT_PADDING);
    };
    fit();
    // fitBounds before the first layout (hidden tab, container still sizing)
    // computes a wrong zoom: fit once more when the map settles.
    const once = google.maps.event.addListenerOnce(map, 'idle', fit);
    return () => once.remove();
    // markers are summarised by `key`; center only matters when there are none
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, center.lat, center.lng]);
  return null;
}

function Placeholder({
  center,
  markers,
  className,
}: Required<Pick<BusinessMapProps, 'center' | 'markers' | 'className'>>) {
  return (
    <div
      role="img"
      aria-label="Mapa no disponible"
      className={`flex aspect-[16/10] w-full flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line bg-surface-muted text-center ${className}`}
    >
      <span className="text-sm font-medium text-ink-muted">
        Mapa no disponible
      </span>
      <span className="text-xs text-ink-muted">
        {markers.length === 1 ? '1 sede' : `${markers.length} sedes`} ·{' '}
        {center.lat.toFixed(3)}, {center.lng.toFixed(3)}
      </span>
    </div>
  );
}

/**
 * Map area shared by the consumer list and the business profile: one pin per
 * branch, an info window on tap, viewport fitted to the pins. Renders a static
 * placeholder when there is no API key (see docs/external-dependencies.md).
 */
export function BusinessMap({
  center,
  markers = [],
  apiKey,
  mapId,
  className = '',
}: BusinessMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!apiKey) {
    return (
      <Placeholder center={center} markers={markers} className={className} />
    );
  }
  const selected = markers.find((m) => m.id === selectedId) ?? null;
  const branded = Boolean(mapId);

  return (
    <div
      role="region"
      aria-label="Mapa"
      data-markers={markers.length}
      className={`aspect-[16/10] w-full overflow-hidden rounded-card border border-line ${className}`}
    >
      <APIProvider apiKey={apiKey} language="es" region="CO">
        <Map
          mapId={mapId ?? undefined}
          defaultCenter={center}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          className="size-full"
          onClick={() => setSelectedId(null)}
        >
          {markers.map((m) =>
            branded ? (
              <AdvancedMarker
                key={m.id}
                position={{ lat: m.lat, lng: m.lng }}
                title={m.label}
                onClick={() => setSelectedId(m.id)}
              >
                <Pin
                  background="#e11d48"
                  borderColor="#9f1239"
                  glyphColor="#fff"
                  scale={selectedId === m.id ? 1.25 : 1}
                />
              </AdvancedMarker>
            ) : (
              <Marker
                key={m.id}
                position={{ lat: m.lat, lng: m.lng }}
                title={m.label}
                onClick={() => setSelectedId(m.id)}
              />
            ),
          )}
          {selected ? (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              pixelOffset={[0, branded ? -36 : -40]}
              headerDisabled
              onCloseClick={() => setSelectedId(null)}
            >
              <div className="flex max-w-56 flex-col gap-1 text-ink">
                <p className="font-semibold">{selected.label}</p>
                {selected.description ? (
                  <p className="text-xs text-ink-muted">
                    {selected.description}
                  </p>
                ) : null}
                {selected.href ? (
                  <a
                    href={selected.href}
                    className="text-sm font-semibold text-brand-600"
                  >
                    Ver cupones
                  </a>
                ) : null}
              </div>
            </InfoWindow>
          ) : null}
          <Viewport center={center} markers={markers} />
        </Map>
      </APIProvider>
    </div>
  );
}
