const CACHE_NAME = 'tsewa-v2';
const IMAGE_CACHE = 'tsewa-images-v1';
const IMAGE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// App shell: pre-cached during install
const APP_SHELL = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html',
];

// ---------------------------------------------------------------------------
// Install: pre-cache the app shell + discover & cache the hashed JS bundle
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Pre-cache the static app shell
      await cache.addAll(APP_SHELL);

      // Discover the hashed JS bundle by fetching the index page and parsing it
      try {
        const indexResponse = await fetch('/');
        const html = await indexResponse.clone().text();
        // Match Expo's entry JS bundle path (e.g. /_expo/static/js/web/entry-abc123.js)
        const bundleMatch = html.match(/\/_expo\/static\/js\/web\/entry-[a-f0-9]+\.js/);
        if (bundleMatch) {
          await cache.add(bundleMatch[0]);
        }
        // Also grab any CSS bundles
        const cssMatches = html.matchAll(/\/_expo\/static\/css\/[^"'\s]+\.css/g);
        for (const m of cssMatches) {
          await cache.add(m[0]).catch(() => {}); // best-effort
        }
      } catch (e) {
        // If we're installing from a cached page, bundle discovery may fail — that's OK
        console.warn('[sw] Bundle discovery failed during install:', e);
      }
    })
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate: clean up old caches
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  const KEEP = [CACHE_NAME, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Fetch: route requests through the appropriate caching strategy
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // --- API calls: network-only, never cache ---
  if (url.pathname.startsWith('/api/')) return;

  // --- Images (unsplash, uploads, common image extensions): cache-first, 7-day expiry ---
  if (isImageRequest(url, request)) {
    event.respondWith(imageCacheFirst(request));
    return;
  }

  // --- App shell (HTML, JS, CSS): stale-while-revalidate ---
  if (isAppShell(url, request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // --- Everything else: network-first with cache fallback ---
  event.respondWith(networkFirst(request));
});

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

/** Stale-while-revalidate: return cache immediately, update in background */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Fire off network fetch to update cache in background
  const networkFetch = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    // Return cached version immediately; network updates cache in background
    networkFetch; // intentionally not awaited
    return cached;
  }

  // Nothing in cache — must wait for network
  const response = await networkFetch;
  if (response) return response;

  // Last resort: offline fallback for navigation requests
  if (request.mode === 'navigate') {
    return cache.match('/offline.html');
  }
  return new Response('Offline', { status: 503 });
}

/** Network-first: try network, fall back to cache */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      return cache.match('/offline.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

/** Cache-first for images with 7-day expiry */
async function imageCacheFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    // Check expiry via custom header
    const cachedAt = cached.headers.get('sw-cached-at');
    if (cachedAt && (Date.now() - Number(cachedAt)) < IMAGE_MAX_AGE) {
      return cached;
    }
    // Expired — fall through to network
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // Clone and add a timestamp header for expiry tracking
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', String(Date.now()));
      const stamped = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, stamped);
    }
    return response;
  } catch (e) {
    if (cached) return cached; // return stale image rather than nothing
    return new Response('', { status: 503 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isImageRequest(url, request) {
  if (url.hostname.includes('unsplash.com')) return true;
  if (url.pathname.startsWith('/uploads/')) return true;
  if (/\.(png|jpe?g|gif|svg|webp|ico|avif)(\?.*)?$/i.test(url.pathname)) return true;
  const accept = request.headers.get('Accept') || '';
  if (accept.startsWith('image/')) return true;
  return false;
}

function isAppShell(url, request) {
  // Navigation requests (HTML pages)
  if (request.mode === 'navigate') return true;
  // JS bundles
  if (/\.(js|mjs)(\?.*)?$/i.test(url.pathname)) return true;
  // CSS
  if (/\.css(\?.*)?$/i.test(url.pathname)) return true;
  // Exact app shell paths
  if (APP_SHELL.includes(url.pathname)) return true;
  return false;
}
