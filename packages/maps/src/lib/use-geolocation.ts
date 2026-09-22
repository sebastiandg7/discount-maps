'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MAP_CENTER } from '@org/domain';

export interface LatLng {
  lat: number;
  lng: number;
}

export type GeolocationStatus =
  'idle' | 'locating' | 'granted' | 'denied' | 'unavailable' | 'timeout';

export interface GeolocationState {
  /** The user's position, or the Bogotá fallback until one is granted. */
  center: LatLng;
  status: GeolocationStatus;
  /** True whenever `center` is not the user's real position. */
  isFallback: boolean;
  /** Requests the position again (e.g. from a "Usar mi ubicación" button). */
  locate: () => void;
}

export interface UseGeolocationOptions {
  /** Request the position on mount (default true). */
  auto?: boolean;
  timeoutMs?: number;
}

const FALLBACK: LatLng = { ...DEFAULT_MAP_CENTER };

/**
 * One-shot geolocation with the product fallback: denied, unavailable or timed
 * out requests keep the default center and flag the state so the UI can show
 * "Ubicación no disponible".
 */
export function useGeolocation({
  auto = true,
  timeoutMs = 8000,
}: UseGeolocationOptions = {}): GeolocationState {
  const [center, setCenter] = useState<LatLng>(FALLBACK);
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const locate = useCallback(() => {
    const geo =
      typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    geo.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus('granted');
      },
      (error) => {
        if (!mounted.current) return;
        if (error.code === error.PERMISSION_DENIED) setStatus('denied');
        else if (error.code === error.TIMEOUT) setStatus('timeout');
        else setStatus('unavailable');
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  }, [timeoutMs]);

  useEffect(() => {
    if (auto) locate();
  }, [auto, locate]);

  return { center, status, isFallback: status !== 'granted', locate };
}
