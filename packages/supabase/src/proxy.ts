import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';
import { publicEnv } from './env';
import { roleFromClaims, type UserRole } from './roles';

export interface SessionInfo {
  /** Response to return (carries refreshed auth cookies). Add redirects via `redirectTo`. */
  response: NextResponse;
  /** Signed-in user id, or null. */
  userId: string | null;
  /** Role carried in the JWT `app_metadata`, or null when signed out. */
  role: UserRole | null;
  /** Build a redirect that keeps the refreshed cookies. */
  redirectTo: (pathOrUrl: string) => NextResponse;
}

/**
 * Refreshes the Supabase session cookies on every request and exposes the user's
 * id/role for route gating. Call from each app's `src/proxy.ts`.
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionInfo> {
  const { url, publishableKey } = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims verifies the JWT locally (asymmetric keys) and refreshes it when needed.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const redirectTo = (pathOrUrl: string) => {
    const target = pathOrUrl.startsWith('http')
      ? new URL(pathOrUrl)
      : new URL(pathOrUrl, request.url);
    const redirect = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  return {
    response,
    userId: claims?.sub ?? null,
    role: roleFromClaims(claims),
    redirectTo,
  };
}

/** Matcher shared by both apps: everything except static assets and PWA files. */
export const PROXY_MATCHER =
  '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)';
