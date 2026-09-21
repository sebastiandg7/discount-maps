import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './database.types';
import { publicEnv } from './env';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Runs with the signed-in user's session, so Row Level Security applies.
 */
export async function createServerSupabase() {
  // cookies() first: it opts the route out of static prerendering before env is read.
  const cookieStore = await cookies();
  const { url, publishableKey } = publicEnv();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS. Only for trusted server code
 * (billing, webhooks, push dispatch, admin tasks). Never import from client code.
 */
export function createAdminSupabase() {
  const { url } = publicEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing SUPABASE_SECRET_KEY.');
  }
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;
export type AdminSupabase = ReturnType<typeof createAdminSupabase>;
