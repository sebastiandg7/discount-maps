import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
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

/**
 * Public origin of the current request (e.g. `https://app.vercel.app`), for the links
 * Supabase puts in confirmation emails and OAuth redirects. Read from the request so
 * every deployment (local, Vercel preview, production) links back to itself; falls back
 * to `NEXT_PUBLIC_APP_URL`, then `fallback`. The origin must also be allowed in the
 * Supabase project (Auth → URL Configuration) or Supabase sends its Site URL instead.
 */
export async function requestOrigin(fallback: string): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? fallback;
  }
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  const proto = h.get('x-forwarded-proto') ?? (local ? 'http' : 'https');
  return `${proto}://${host}`;
}

export type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;
export type AdminSupabase = ReturnType<typeof createAdminSupabase>;
