/* OXEN Service Worker — offline-first cache, background sync, auto-update.
 * Strategy:
 *  - Precache app shell (HTML, JS, CSS, icons, local assets, placeholders).
 *  - Cache-first for static assets (fonts, images, icons, local /assets/).
 *  - Stale-while-revalidate for same-origin GET requests.
 *  - Cache-first for cross-origin media (Unsplash, flagcdn, pravatar, video samples).
 *  - Network-first for navigation (HTML) with offline fallback.
 *  - Bypass for Supabase auth / API POST requests.
 */
const CACHE_VERSION = "oxen-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const MEDIA_CACHE = `${CACHE_VERSION}-media`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.png",
  "/logo.png",
  "/offline.html",
  "/placeholder.svg",
  // Local asset placeholders
  "/assets/countries/placeholder.svg",
  "/assets/universities/placeholder.svg",
  "/assets/universities/logo-placeholder.svg",
  "/assets/posts/placeholder.svg",
  "/assets/avatars/placeholder.svg",
  "/assets/videos/placeholder.svg",
];

/* Cross-origin media hosts whose GET responses we should cache for offline */
const MEDIA_HOSTS = [
  "images.unsplash.com",
  "i.pravatar.cc",
  "flagcdn.com",
  "commondatastorage.googleapis.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => undefined),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    /\.(?:png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|css|js|wasm)$/i.test(url.pathname)
  );
}

function isCrossOriginMedia(url) {
  return MEDIA_HOSTS.some((h) => url.hostname.includes(h));
}

function isApiRequest(url) {
  return (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("rork.app") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Bypass Supabase/auth API calls
  if (url.origin !== self.location.origin && isApiRequest(url)) return;

  // Navigation — network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Local static assets — cache-first (includes /assets/ placeholders)
  if (isStaticAsset(url) || url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Cross-origin media (Unsplash, flagcdn, pravatar, video samples) —
  // cache-first with runtime caching so images work offline
  if (isCrossOriginMedia(url)) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // Same-origin — stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Other cross-origin GET (e.g. Supabase Storage images) —
  // try network, cache on success, fallback to cache
  event.respondWith(networkWithCacheFallback(request, MEDIA_CACHE));
});

async function networkFirstNavigation(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, fresh.clone()).catch(() => undefined);
    return fresh;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok || fresh.type === "opaque") {
      cache.put(request, fresh.clone()).catch(() => undefined);
    }
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((fresh) => {
      if (fresh.ok) cache.put(request, fresh.clone()).catch(() => undefined);
      return fresh;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function networkWithCacheFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok || fresh.type === "opaque") {
      cache.put(request, fresh.clone()).catch(() => undefined);
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}
