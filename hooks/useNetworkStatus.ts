"use client";

import { useEffect, useState, useCallback } from "react";
import { NetworkStatusInfo } from "@/lib/types";
import {
  BeforeInstallPromptEvent,
  registerDroplyServiceWorker,
} from "@/lib/offline/sw-register";

const CORE_OFFLINE_URLS = [
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

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatusInfo>({
    browserOnline: true,
    isSecureContext: true,
    serviceWorkerReady: false,
    appCachedOffline: false,
    webrtcSupported: true,
    cameraSupported: true,
  });

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalledPWA, setIsInstalledPWA] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isPrecaching, setIsPrecaching] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string; type?: string };
    };

    const checkEnvironment = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true;
      setIsInstalledPWA(Boolean(standalone));

      setStatus((prev) => ({
        ...prev,
        browserOnline: navigator.onLine,
        isSecureContext: window.isSecureContext,
        webrtcSupported: typeof RTCPeerConnection !== "undefined",
        cameraSupported: Boolean(
          navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ),
        connectionType:
          nav.connection?.type || nav.connection?.effectiveType || undefined,
      }));
    };

    checkEnvironment();

    void registerDroplyServiceWorker((cachedReady) => {
      setStatus((prev) => ({
        ...prev,
        serviceWorkerReady: "serviceWorker" in navigator,
        appCachedOffline: cachedReady,
      }));
    });

    const handleOnline = () =>
      setStatus((prev) => ({ ...prev, browserOnline: true }));
    const handleOffline = () =>
      setStatus((prev) => ({ ...prev, browserOnline: false }));
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalledPWA(true);
      setIsInstallModalOpen(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstallPWA = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        setIsInstalledPWA(true);
        setIsInstallModalOpen(false);
        return true;
      }
      return false;
    }
    // If native beforeinstallprompt is not available, open the guided install modal
    setIsInstallModalOpen(true);
    return false;
  }, [installPrompt]);

  const precacheAllRoutes = useCallback(async () => {
    if (typeof window === "undefined" || !("caches" in window)) return false;
    setIsPrecaching(true);
    try {
      const cache = await window.caches.open("droply-v1.2-shell");
      await Promise.allSettled(
        CORE_OFFLINE_URLS.map(async (url) => {
          const res = await fetch(url, { cache: "no-cache" });
          if (res && res.ok) {
            await cache.put(url, res);
          }
        })
      );
      setStatus((prev) => ({ ...prev, appCachedOffline: true }));
      return true;
    } catch {
      return false;
    } finally {
      setIsPrecaching(false);
    }
  }, []);

  return {
    status,
    canInstallPWA: Boolean(installPrompt) && !isInstalledPWA,
    isInstalledPWA,
    isInstallModalOpen,
    setIsInstallModalOpen,
    promptInstallPWA,
    precacheAllRoutes,
    isPrecaching,
  };
}
