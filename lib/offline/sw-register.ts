export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const CURRENT_CACHE_PREFIX = "letsshare-v4.0";

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
      sw.postMessage({ type: "PREWARM_ROUTES" });
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
