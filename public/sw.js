const CACHE_NAME = 'careeros-v2';
const STATIC_CACHE = 'careeros-static-v2';
const API_CACHE = 'careeros-api-v2';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/jobs',
  '/saved-jobs',
  '/applications',
  '/resumes',
  OFFLINE_URL,
];

const CACHE_STRATEGIES = {
  static: {
    pattern: /\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/,
    strategy: 'cache-first',
    maxAge: 60 * 60 * 24 * 7,
  },
  api: {
    pattern: /\/api\//,
    strategy: 'network-first',
    maxAge: 60 * 5,
  },
  pages: {
    pattern: /\/(dashboard|jobs|saved-jobs|applications|resumes|interview|analytics|alerts|profile|cover-letter)$/,
    strategy: 'stale-while-revalidate',
    maxAge: 60 * 60,
  },
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  const cacheStrategy = getCacheStrategy(request);

  event.respondWith(handleFetch(request, cacheStrategy));
});

function getCacheStrategy(request) {
  const url = request.url;

  if (CACHE_STRATEGIES.static.pattern.test(url)) {
    return { ...CACHE_STRATEGIES.static, cache: STATIC_CACHE };
  }
  if (CACHE_STRATEGIES.api.pattern.test(url)) {
    return { ...CACHE_STRATEGIES.api, cache: API_CACHE };
  }
  if (CACHE_STRATEGIES.pages.pattern.test(url)) {
    return { ...CACHE_STRATEGIES.pages, cache: STATIC_CACHE };
  }

  return null;
}

async function offlineFallback(request) {
  if (request.mode === 'navigate') {
    const cached = await caches.match(OFFLINE_URL);
    if (cached) return cached;
  }
  return new Response('Offline', { status: 503 });
}

async function handleFetch(request, strategy) {
  if (!strategy) {
    try {
      return await fetch(request);
    } catch {
      return offlineFallback(request);
    }
  }

  const { strategy: mode, cache, maxAge } = strategy;

  switch (mode) {
    case 'cache-first':
      return cacheFirst(request, cache, maxAge);
    case 'network-first':
      return networkFirst(request, cache, maxAge);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, cache, maxAge);
    default:
      return fetch(request);
  }
}

async function cacheFirst(request, cacheName, maxAge) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirst(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return offlineFallback(request);
  }
}

async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || offlineFallback(request);
}

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
