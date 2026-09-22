/*
 * Discount Maps service worker.
 * - Offline fallback: navigations that fail on the network show /sin-conexion
 *   (pre-cached at install). Nothing else is cached: pages depend on the
 *   session cookie and Supabase data must stay fresh.
 * - Web Push: shows the notification and opens the coupon on tap.
 */

const CACHE = 'dm-shell-v1';
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

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'Discount Maps';
  const options = {
    body: payload.body || 'Hay un cupón nuevo cerca de ti.',
    icon: payload.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.tag || 'new-coupon',
    renotify: true,
    data: { url: payload.url || '/mapas' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || '/mapas',
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(
          (c) => 'focus' in c && new URL(c.url).origin === self.location.origin,
        );
        if (existing) {
          return existing.navigate
            ? existing.navigate(url).then((c) => c && c.focus())
            : existing.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
