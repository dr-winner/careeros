const STATIC_CACHE = 'careeros-static-v4';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache APIs, HTML navigations, or non-GET. Stale dashboard HTML
  // showed paying users as free and hid nav items for up to an hour.
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }
  if (request.mode === 'navigate' || isHtmlRequest(request)) {
    event.respondWith(networkOnly(request));
    return;
  }

  const cacheStrategy = getCacheStrategy(url);
  if (!cacheStrategy) {
    return;
  }

  event.respondWith(cacheFirst(request, cacheStrategy.cache));
});

function isHtmlRequest(request) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function getCacheStrategy(url) {
  // Fingerprinted Next assets only. Do not cache /sw.js or HTML shells.
  if (url.pathname.startsWith('/_next/static/')) {
    return { cache: STATIC_CACHE };
  }
  if (/\.(png|jpg|jpeg|svg|ico|woff2?)$/i.test(url.pathname)) {
    return { cache: STATIC_CACHE };
  }
  return null;
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    if (request.mode === 'navigate') {
      const cached = await caches.match(OFFLINE_URL);
      if (cached) return cached;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
