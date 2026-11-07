export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
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
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    const triggerPrewarm = (sw: ServiceWorker | null) => {
      if (!sw) return;
      sw.postMessage({ type: "PREWARM_ROUTES" });
    };

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
            // New update available, activate immediately
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

    // Also verify Cache Storage directly
    if ("caches" in window) {
      const keys = await window.caches.keys();
      const hasShell = keys.some((k) => k.startsWith("droply-"));
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

