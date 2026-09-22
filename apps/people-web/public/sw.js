/* Discount Maps service worker: push notifications only (no fetch handler / offline cache yet). */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
