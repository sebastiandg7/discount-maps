import type { NextRequest } from 'next/server';
import { updateSession } from '@org/supabase/proxy';

/** Routes reachable without a session. */
const PUBLIC_PATHS = new Set(['/', '/login', '/registro']);
/** Routes a signed-in user should not see again. */
const AUTH_PATHS = new Set(['/login', '/registro']);

export async function proxy(request: NextRequest) {
  const { response, userId, role, redirectTo } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Auth callback / sign-out and API routes manage their own session handling.
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
    return response;
  }

  if (!userId) {
    if (PUBLIC_PATHS.has(pathname)) return response;
    return redirectTo(`/login?next=${encodeURIComponent(pathname)}`);
  }

  // Merchants belong in the business app.
  if (role === 'business') {
    const businessApp =
      process.env.NEXT_PUBLIC_BUSINESS_APP_URL ?? 'http://localhost:3001';
    return redirectTo(`${businessApp}/inicio`);
  }

  if (pathname === '/' || AUTH_PATHS.has(pathname)) {
    return redirectTo('/inicio');
  }

  return response;
}

export const config = {
  // Everything except Next internals, static assets and PWA files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
