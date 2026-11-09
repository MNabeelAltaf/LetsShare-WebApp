const CACHE_VERSION = "letsshare-v5.0";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const APP_SHELL_URLS = [
  "/",
  "/send",
  "/receive",
  "/setup",
  "/transfer",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/app-icon.png",
  "/icons/apple-touch-icon.png",
  "/icons/logo-light.png",
  "/icons/logo-dark.png",
  "/icons/logo-mark.png",
  "/icons/favicon-32x32.png",
  "/icons/favicon-16x16.png",
];

/**
 * Extracts Next.js static chunk URLs (`/_next/static/...`) from an HTML string
 * so route-specific JS and CSS bundles are pre-cached alongside the HTML shell.
 */
function extractStaticAssetUrls(htmlText) {
  const matches = htmlText.match(/\/_next\/static\/[^"'\s<>\\)]+/g) || [];
  return Array.from(new Set(matches));
}

async function prewarmShellAndAssets(extraAssetUrls = []) {
  const shellCache = await caches.open(SHELL_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);
  const discoveredAssets = new Set(extraAssetUrls);

  await Promise.allSettled(
    APP_SHELL_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { cache: "no-cache" });
        if (response && response.ok) {
          const clone = response.clone();
          await shellCache.put(url, clone);

          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            const html = await response.text();
            for (const assetUrl of extractStaticAssetUrls(html)) {
              discoveredAssets.add(assetUrl);
            }
          }
        }
      } catch {
        // Ignore offline errors during prewarm
      }
    })
  );

  await Promise.allSettled(
    Array.from(discoveredAssets).map(async (assetUrl) => {
      try {
        const existing = await staticCache.match(assetUrl);
        if (existing) return;
        const res = await fetch(assetUrl, { cache: "force-cache" });
        if (res && res.ok) {
          await staticCache.put(assetUrl, res);
        }
      } catch {
        // Ignore offline errors
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await prewarmShellAndAssets();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== SHELL_CACHE && key !== STATIC_CACHE) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (data.type === "PREWARM_ROUTES") {
    const extraAssets = Array.isArray(data.assets) ? data.assets : [];
    event.waitUntil(
      (async () => {
        await prewarmShellAndAssets(extraAssets);
        if (event.source) {
          event.source.postMessage({
            type: "OFFLINE_CACHE_READY",
            cached: true,
          });
        }
      })()
    );
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/__nextjs")
  ) {
    return;
  }

  // Immutable hashed Next.js static chunks: Cache-First with network fallback
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const staticCache = await caches.open(STATIC_CACHE);
        const cached = await staticCache.match(request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            staticCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response("Offline asset unavailable", { status: 503 });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const isNavigation =
        request.mode === "navigate" ||
        request.headers.get("accept")?.includes("text/html");
      const targetCacheName = isNavigation ? SHELL_CACHE : STATIC_CACHE;
      const cache = await caches.open(targetCacheName);

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          cache.put(
            isNavigation ? url.pathname : request,
            networkResponse.clone()
          );
        }
        return networkResponse;
      } catch {
        const cached =
          (await cache.match(isNavigation ? url.pathname : request)) ||
          (await cache.match(request)) ||
          (await caches.match(url.pathname)) ||
          (await caches.match(request));

        if (cached) return cached;

        if (isNavigation) {
          const homeCached = await caches.match("/");
          if (homeCached) return homeCached;
        }

        return new Response("Offline", { status: 503 });
      }
    })()
  );
});
