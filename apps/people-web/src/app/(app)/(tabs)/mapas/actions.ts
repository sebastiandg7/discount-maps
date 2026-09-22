'use server';

import {
  CATEGORY_IDS,
  DEFAULT_SEARCH_RADIUS_M,
  type BusinessCategory,
} from '@org/domain';
import { publicStorageUrl, type Database } from '@org/supabase';
import { getSession } from '../../../../lib/session';

export type NearbySort = 'distance' | 'discount';

export interface NearbyInput {
  lat: number;
  lng: number;
  category: BusinessCategory | null;
  sort: NearbySort;
  radiusM?: number;
}

type RpcRow =
  Database['public']['Functions']['nearby_businesses']['Returns'][number];

export interface NearbyRow extends RpcRow {
  logo_url: string | null;
}

export type NearbyResult = { rows: NearbyRow[] } | { error: string };

const MAX_RADIUS_M = 50_000;

function isFiniteBetween(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

/** Businesses around a point, one row per branch. Reads run as the signed-in consumer. */
export async function nearbyBusinessesAction(
  input: NearbyInput,
): Promise<NearbyResult> {
  if (
    !isFiniteBetween(input.lat, -90, 90) ||
    !isFiniteBetween(input.lng, -180, 180)
  ) {
    return { error: 'Ubicación inválida.' };
  }
  const category =
    input.category === null ||
    (CATEGORY_IDS as readonly string[]).includes(input.category)
      ? input.category
      : null;
  const sort: NearbySort = input.sort === 'discount' ? 'discount' : 'distance';
  const radius = isFiniteBetween(input.radiusM, 100, MAX_RADIUS_M)
    ? Math.round(input.radiusM)
    : DEFAULT_SEARCH_RADIUS_M;

  const { supabase, userId } = await getSession();
  if (!userId) return { error: 'Inicia sesión para ver el mapa.' };

  const { data, error } = await supabase.rpc('nearby_businesses', {
    p_lat: input.lat,
    p_lng: input.lng,
    p_category: category ?? undefined,
    p_radius_m: radius,
    p_sort: sort,
    p_limit: 50,
  });
  if (error) {
    return { error: 'No pudimos cargar los negocios. Intenta de nuevo.' };
  }
  return {
    rows: (data ?? []).map((row) => ({
      ...row,
      logo_url: publicStorageUrl('logos', row.logo_path),
    })),
  };
}
