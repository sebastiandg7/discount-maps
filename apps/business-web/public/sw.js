/*
 * Discount Maps Empresas service worker: offline fallback only. Navigations
 * that fail on the network show /sin-conexion (pre-cached at install); nothing
 * else is cached because every page depends on the session cookie.
 */

const CACHE = 'dm-business-shell-v1';
const OFFLINE_URL = '/sin-conexion';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Re-fetch the offline page once per worker lifetime so a deploy that changes it
// (same sw.js bytes, so no re-install) does not leave a stale copy in the cache.
let refreshed = false;
function refreshOfflinePage() {
  if (refreshed) return Promise.resolve();
  refreshed = true;
  return caches
    .open(CACHE)
    .then((cache) => cache.add(OFFLINE_URL))
    .catch(() => {
      refreshed = false;
    });
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.waitUntil(refreshOfflinePage());
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then(
        (cached) =>
          cached ||
          new Response('Sin conexión', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }),
      ),
    ),
  );
});
