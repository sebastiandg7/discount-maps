import { act, renderHook } from '@testing-library/react';
import { DEFAULT_MAP_CENTER } from '@org/domain';
import { useGeolocation } from './use-geolocation';

type SuccessCb = (position: GeolocationPosition) => void;
type ErrorCb = (error: GeolocationPositionError) => void;

function installGeolocation(
  impl: ((ok: SuccessCb, fail: ErrorCb) => void) | undefined,
) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: impl ? { getCurrentPosition: jest.fn(impl) } : undefined,
  });
}

function positionError(code: number): GeolocationPositionError {
  return {
    code,
    message: '',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

describe('useGeolocation', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
  });

  it('uses the granted position', () => {
    installGeolocation((ok) =>
      ok({
        coords: { latitude: 4.65, longitude: -74.06 },
      } as GeolocationPosition),
    );
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('granted');
    expect(result.current.isFallback).toBe(false);
    expect(result.current.center).toEqual({ lat: 4.65, lng: -74.06 });
  });

  it('falls back to Bogotá when permission is denied', () => {
    installGeolocation((_ok, fail) => fail(positionError(1)));
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('denied');
    expect(result.current.isFallback).toBe(true);
    expect(result.current.center).toEqual(DEFAULT_MAP_CENTER);
  });

  it('reports timeouts', () => {
    installGeolocation((_ok, fail) => fail(positionError(3)));
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('timeout');
  });

  it('reports a missing geolocation API', () => {
    installGeolocation(undefined);
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('unavailable');
    expect(result.current.center).toEqual(DEFAULT_MAP_CENTER);
  });

  it('does not request on mount when auto is false, but locate() does', () => {
    const impl = jest.fn((ok: SuccessCb) =>
      ok({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition),
    );
    installGeolocation(impl);
    const { result } = renderHook(() => useGeolocation({ auto: false }));
    expect(result.current.status).toBe('idle');
    expect(impl).not.toHaveBeenCalled();
    act(() => result.current.locate());
    expect(impl).toHaveBeenCalledTimes(1);
    expect(result.current.center).toEqual({ lat: 1, lng: 2 });
  });
});
