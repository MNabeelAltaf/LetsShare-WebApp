const CACHE_VERSION = "droply-v1.2";
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
      // Pre-cache each URL individually so one transient failure doesn't abort the whole batch
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
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        await Promise.allSettled(
          APP_SHELL_URLS.map(async (url) => {
            const existing = await cache.match(url);
            if (!existing) {
              const res = await fetch(url);
              if (res && res.ok) {
                await cache.put(url, res);
              }
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
  // Only handle same-origin HTTP(S) requests; never cache blob: or external requests
  if (url.origin !== self.location.origin) return;

  // 1. Versioned static assets (/_next/static/, icons, fonts): Cache First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      (async () => {
        const staticCache = await caches.open(STATIC_CACHE);
        const cached = await staticCache.match(request);
        if (cached) return cached;

        const shellCache = await caches.open(SHELL_CACHE);
        const shellCached = await shellCache.match(request);
        if (shellCached) return shellCached;

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

  // 2. HTML Document Navigation requests: Network First with immediate Cache fallback (Stale-While-Revalidate when online)
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(url.pathname, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedPage =
            (await cache.match(url.pathname)) ||
            (await cache.match(request)) ||
            (await cache.match("/"));
          if (cachedPage) return cachedPage;

          return new Response(
            `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Droply Offline</title><style>body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}.card{max-width:420px;border:1px solid #27272a;border-radius:16px;padding:32px;background:#18181b}h1{margin:0 0 12px;font-size:22px}p{color:#a1a1aa;line-height:1.5;font-size:14px}a{display:inline-block;margin-top:16px;padding:10px 20px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}</style></head><body><div class="card"><h1>Droply Offline Mode</h1><p>This route was not cached before going offline. Return to the main dashboard to send or receive files offline.</p><a href="/">Open Droply Dashboard</a></div></body></html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        }
      })()
    );
    return;
  }

  // 3. Other same-origin requests (RSC payloads, manifest.json, chunks): Stale-While-Revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cached) {
        return cached;
      }

      const networkResponse = await fetchPromise;
      if (networkResponse) return networkResponse;

      const shellCache = await caches.open(SHELL_CACHE);
      const shellMatch = await shellCache.match(url.pathname);
      if (shellMatch) return shellMatch;

      return new Response("Offline", { status: 503 });
    })()
  );
});

