import 'server-only';

import { cache } from 'react';
import { roleFromClaims, type Tables } from '@org/supabase';
import { createServerSupabase } from '@org/supabase/server';

/** Session for the current request (memoized per render). */
export const getSession = cache(async () => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  return {
    supabase,
    userId: claims?.sub ?? null,
    role: roleFromClaims(claims),
    email: typeof claims?.email === 'string' ? claims.email : null,
  };
});

export type Business = Tables<'businesses'>;

/** The business owned by the signed-in merchant, or null (memoized per render). */
export const getOwnBusiness = cache(async (): Promise<Business | null> => {
  const { supabase, userId } = await getSession();
  if (!userId) return null;
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();
  return data ?? null;
});
