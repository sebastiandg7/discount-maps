import 'server-only';

import { cache } from 'react';
import { roleFromClaims } from '@org/supabase';
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guards route params before they reach a uuid column (avoids a cast error). */
export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
