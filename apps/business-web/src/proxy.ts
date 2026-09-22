import type { NextRequest } from 'next/server';
import { updateSession } from '@org/supabase/proxy';

const PUBLIC_PATHS = new Set(['/', '/login', '/registro', '/sin-conexion']);
const AUTH_PATHS = new Set(['/login', '/registro']);

export async function proxy(request: NextRequest) {
  const { response, userId, role, redirectTo } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
    return response;
  }

  if (!userId) {
    if (PUBLIC_PATHS.has(pathname)) return response;
    return redirectTo(`/login?next=${encodeURIComponent(pathname)}`);
  }

  // Consumers belong in the people app. Admins may use this app (for /admin).
  if (role === 'consumer') {
    const peopleApp =
      process.env.NEXT_PUBLIC_PEOPLE_APP_URL ?? 'http://localhost:3000';
    return redirectTo(`${peopleApp}/inicio`);
  }

  if (pathname === '/' || AUTH_PATHS.has(pathname)) {
    return redirectTo('/inicio');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
