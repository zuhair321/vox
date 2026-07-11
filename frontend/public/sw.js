// Vox Service Worker — handles:
// 1. Offline caching (static assets)
// 2. Native push notifications (when triggered by the app)
// 3. Background message queue for offline sends

const CACHE_NAME = 'vox-v2';
const OFFLINE_URL = '/offline.html';

// Assets to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
];

// ── Install: precache critical assets ───────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-fatal: some assets may not exist yet in dev
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for HTML/API, cache-first for hashed assets ────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API calls
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls: network-only with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Offline API response
          return new Response(
            JSON.stringify({ error: 'You are offline.', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Navigation / HTML: network-first so the entry document is always fresh
  // and references the latest hashed bundle. Cached only as a fallback.
  const isNavigation = request.mode === 'navigate'
    || url.pathname === '/'
    || url.pathname.endsWith('.html');
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets (hashed bundles / CSS / etc.): cache-first. Their hash
  // changes when content changes, so a stale hit would 404 anyway.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// ── Push: show native notification ───────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'VOX', body: event.data.text() };
  }

  const { title = 'VOX', body = '', icon = '/favicon.ico', tag, data: notifData } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag: tag || `vox-${Date.now()}`,
      badge: '/favicon.ico',
      requireInteraction: false,
      silent: false,
      data: notifData,
    })
  );
});

// ── Notification click: focus/focus app window ──────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (event.notification.data?.channelId) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              channelId: event.notification.data.channelId,
              messageId: event.notification.data.messageId,
            });
          }
          return;
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        const url = event.notification.data?.channelId
          ? `/channels/${event.notification.data.channelId}`
          : '/';
        return self.clients.openWindow(url);
      }
    })
  );
});

// ── Message: receive commands from the main thread ───────────────
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data } = payload || {};
    self.registration.showNotification(title || 'VOX', {
      body: body || '',
      icon: icon || '/favicon.ico',
      tag: tag || `vox-${Date.now()}`,
      badge: '/favicon.ico',
      data,
    });
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
