const CACHE_VERSION = "letsshare-v4.0";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const APP_SHELL_URLS = [
  "/",
  "/send",
  "/receive",
  "/setup",
  "/transfer",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(
        APP_SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "no-cache" });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // Ignore offline errors during install
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      let hadLegacyCache = false;
      await Promise.all(
        keys.map((key) => {
          if (key !== SHELL_CACHE && key !== STATIC_CACHE) {
            hadLegacyCache = true;
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
      if (hadLegacyCache) {
        const windowClients = await self.clients.matchAll({ type: "window" });
        for (const client of windowClients) {
          try {
            await client.navigate(client.url);
          } catch {
            // Ignore navigation errors
          }
        }
      }
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
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        await Promise.allSettled(
          APP_SHELL_URLS.map(async (url) => {
            try {
              const res = await fetch(url, { cache: "no-cache" });
              if (res && res.ok) {
                await cache.put(url, res);
              }
            } catch {
              // Ignore when offline
            }
          })
        );
        if (event.source) {
          event.source.postMessage({ type: "OFFLINE_CACHE_READY", cached: true });
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
          cache.put(isNavigation ? url.pathname : request, networkResponse.clone());
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
