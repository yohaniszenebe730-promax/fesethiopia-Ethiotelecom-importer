// ============================================
//   FES ETHIOPIA — Service Worker v1.0
//   Auto Offline Pages for GitHub Pages
// ============================================

const CACHE_NAME = 'fes-cache-v1';
const OFFLINE_PAGE = '/offline.html';

// Files to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  // Add more of your site's assets below:
  // '/style.css',
  // '/app.js',
  // '/logo.png',
];

// ── Install: pre-cache assets ──────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(PRECACHE_ASSETS.filter(async (url) => {
        try { await fetch(url, { method: 'HEAD' }); return true; }
        catch { return false; }
      }));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first with offline fallback ──
self.addEventListener('fetch', (event) => {
  // Skip non-GET and browser-extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone & cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: try cache first
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;

          // For navigation requests, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
          }

          // For other requests (images, css, etc.), return empty response
          return new Response('', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});
