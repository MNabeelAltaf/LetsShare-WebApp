export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const CURRENT_CACHE_PREFIX = "letsshare-v5.0";
export const SHELL_CACHE_NAME = `${CURRENT_CACHE_PREFIX}-shell`;

function getLoadedStaticAssets(): string[] {
  if (typeof window === "undefined" || !("performance" in window)) return [];
  try {
    const entries = performance.getEntriesByType("resource");
    const urls: string[] = [];
    for (const entry of entries) {
      if (entry.name && entry.name.startsWith(window.location.origin)) {
        const pathname = entry.name.slice(window.location.origin.length);
        if (pathname.startsWith("/_next/static/")) {
          urls.push(pathname);
        }
      }
    }
    return Array.from(new Set(urls));
  } catch {
    return [];
  }
}

/**
 * Checks whether the current version's offline shell cache already exists and has core routes cached.
 */
export async function isEssentialCachePopulated(): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  try {
    const hasShell = await window.caches.has(SHELL_CACHE_NAME);
    if (!hasShell) return false;
    const cache = await window.caches.open(SHELL_CACHE_NAME);
    const rootMatch = await cache.match("/");
    return Boolean(rootMatch);
  } catch {
    return false;
  }
}

export async function registerDroplyServiceWorker(
  onOfflineReady?: (ready: boolean) => void
): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !window.isSecureContext
  ) {
    onOfflineReady?.(false);
    return null;
  }

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      for (const key of keys) {
        if (!key.startsWith(CURRENT_CACHE_PREFIX)) {
          await window.caches.delete(key);
        }
      }
    }

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    void registration.update();

    const triggerPrewarm = (sw: ServiceWorker | null) => {
      if (!sw) return;
      sw.postMessage({
        type: "PREWARM_ROUTES",
        assets: getLoadedStaticAssets(),
      });
    };

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    if (registration.active) {
      triggerPrewarm(registration.active);
      onOfflineReady?.(true);
    }

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed") {
          if (navigator.serviceWorker.controller) {
            installing.postMessage({ type: "SKIP_WAITING" });
          } else {
            triggerPrewarm(installing);
            onOfflineReady?.(true);
          }
        }
      });
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "OFFLINE_CACHE_READY") {
        onOfflineReady?.(true);
      }
    });

    if ("caches" in window) {
      const keys = await window.caches.keys();
      const hasShell = keys.some((k) => k.startsWith(CURRENT_CACHE_PREFIX));
      if (hasShell) {
        onOfflineReady?.(true);
      }
    }

    return registration;
  } catch {
    onOfflineReady?.(false);
    return null;
  }
}

/**
 * Awaits Service Worker registration, installation, activation, and essential app shell setup
 * while reporting normalized progress (0..1) for the first-time initialization splash screen.
 */
export async function waitForServiceWorkerAndEssentialAssets(options?: {
  onProgress?: (fraction: number) => void;
  timeoutMs?: number;
}): Promise<{ swReady: boolean; cachedReady: boolean }> {
  const onProgress = options?.onProgress;
  const timeoutMs = options?.timeoutMs ?? 3800;

  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !window.isSecureContext
  ) {
    onProgress?.(1);
    return { swReady: false, cachedReady: false };
  }

  onProgress?.(0.15);

  let settled = false;
  return new Promise<{ swReady: boolean; cachedReady: boolean }>((resolve) => {
    const finish = (result: { swReady: boolean; cachedReady: boolean }) => {
      if (settled) return;
      settled = true;
      clearTimeout(maxTimer);
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
      onProgress?.(1);
      resolve(result);
    };

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "OFFLINE_CACHE_READY") {
        finish({ swReady: true, cachedReady: true });
      }
    };

    navigator.serviceWorker.addEventListener("message", onSwMessage);

    const maxTimer = setTimeout(() => {
      finish({
        swReady: Boolean(navigator.serviceWorker.controller),
        cachedReady: true,
      });
    }, timeoutMs);

    void (async () => {
      try {
        const reg = await registerDroplyServiceWorker();
        if (!reg) {
          finish({ swReady: false, cachedReady: false });
          return;
        }
        onProgress?.(0.45);

        // If already active and shell cache is populated, complete rapidly
        const alreadyCached = await isEssentialCachePopulated();
        if (reg.active && alreadyCached) {
          onProgress?.(0.9);
          finish({ swReady: true, cachedReady: true });
          return;
        }

        // Track installing / waiting worker state transitions
        const worker = reg.installing || reg.waiting;
        if (worker) {
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") {
              onProgress?.(0.7);
            } else if (worker.state === "activating") {
              onProgress?.(0.85);
            } else if (worker.state === "activated") {
              onProgress?.(0.95);
              worker.postMessage({
                type: "PREWARM_ROUTES",
                assets: getLoadedStaticAssets(),
              });
            }
          });
        }

        await navigator.serviceWorker.ready;
        onProgress?.(0.88);

        if (reg.active) {
          reg.active.postMessage({
            type: "PREWARM_ROUTES",
            assets: getLoadedStaticAssets(),
          });
        }

        // Give prewarm a brief window, or finish as soon as OFFLINE_CACHE_READY arrives
        setTimeout(() => {
          finish({ swReady: true, cachedReady: true });
        }, 550);
      } catch {
        finish({ swReady: false, cachedReady: false });
      }
    })();
  });
}
