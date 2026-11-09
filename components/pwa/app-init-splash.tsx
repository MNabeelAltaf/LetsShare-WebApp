"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  ArrowRight,
  Wifi,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { initializeOfflineDatabase } from "@/lib/offline/indexed-db";
import {
  isEssentialCachePopulated,
  waitForServiceWorkerAndEssentialAssets,
} from "@/lib/offline/sw-register";
import { cn } from "@/lib/utils";

const INIT_STORAGE_KEY = "droply-pwa-initialized-v5";
const SESSION_BOOT_KEY = "droply-session-booted";

type InitPhase = "initializing" | "transitioning-out" | "ready" | "error";

export function AppInitSplash() {
  const [phase, setPhase] = useState<InitPhase>("initializing");
  const [progress, setProgress] = useState<number>(14);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Preparing Your Experience..."
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isRunningRef = useRef(false);

  const runInitialization = useCallback(async (isRetry = false) => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      // Fast-path check: if already initialized on this device and cache is ready (and not a manual retry),
      // unlock immediately without unnecessary delay.
      if (!isRetry && typeof window !== "undefined") {
        const sessionBooted =
          sessionStorage.getItem(SESSION_BOOT_KEY) === "true";
        const previouslyInitialized =
          localStorage.getItem(INIT_STORAGE_KEY) === "true";

        if (sessionBooted && previouslyInitialized) {
          setPhase("ready");
          isRunningRef.current = false;
          return;
        }

        if (previouslyInitialized) {
          const cacheReady = await isEssentialCachePopulated();
          if (cacheReady) {
            sessionStorage.setItem(SESSION_BOOT_KEY, "true");
            setPhase("ready");
            isRunningRef.current = false;
            return;
          }
        }
      }

      // First-time launch (or cache rebuild): run full background initialization
      setErrorMessage(null);
      setPhase("initializing");
      setProgress(18);
      setStatusMessage("Preparing Your Experience...");

      // 1. Verify essential WebRTC peer-to-peer capability
      if (
        typeof window !== "undefined" &&
        typeof RTCPeerConnection === "undefined"
      ) {
        throw new Error(
          "Your browser does not support direct peer-to-peer file sharing. Please open Droply in Chrome, Safari, Edge, or Firefox."
        );
      }

      // 2. Initialize local offline database (IndexedDB stores)
      const dbOk = await initializeOfflineDatabase();
      setProgress(40);
      setStatusMessage("Getting Droply Ready...");

      // 3. Register, install, activate Service Worker & pre-warm essential offline shell
      await waitForServiceWorkerAndEssentialAssets({
        timeoutMs: 3600,
        onProgress: (swFraction) => {
          const mapped = Math.round(40 + swFraction * 52);
          setProgress((prev) => Math.max(prev, Math.min(92, mapped)));
          if (swFraction >= 0.45) {
            setStatusMessage("Getting Droply Ready...");
          }
        },
      });

      if (!dbOk && typeof window !== "undefined" && !navigator.onLine) {
        throw new Error(
          "We couldn't finish initializing local storage while offline. Please check your browser storage settings and try again."
        );
      }

      // 4. Mark initialization complete and transition smoothly to the main app
      setProgress(100);
      setStatusMessage("Ready to Share!");

      try {
        localStorage.setItem(INIT_STORAGE_KEY, "true");
        sessionStorage.setItem(SESSION_BOOT_KEY, "true");
      } catch {
        // Ignore storage quota / private mode write errors
      }

      setPhase("transitioning-out");
      setTimeout(() => {
        setPhase("ready");
        isRunningRef.current = false;
      }, 280);
    } catch (err) {
      isRunningRef.current = false;
      setPhase("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "We couldn't complete the initial setup. Please try again."
      );
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runInitialization(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [runInitialization]);

  // Lock background scroll and interaction while the initialization splash screen is active
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (
      phase === "initializing" ||
      phase === "transitioning-out" ||
      phase === "error"
    ) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [phase]);

  const handleContinueAnyway = () => {
    try {
      sessionStorage.setItem(SESSION_BOOT_KEY, "true");
    } catch {
      // Ignore storage error
    }
    setPhase("transitioning-out");
    setTimeout(() => {
      setPhase("ready");
    }, 240);
  };

  if (phase === "ready") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy={phase === "initializing"}
      aria-label="Application Initialization"
      data-no-swipe="true"
      className={cn(
        "fixed inset-0 z-100 flex min-h-dvh w-full flex-col items-center justify-between bg-background px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-foreground select-none touch-none transition-opacity duration-300 ease-out",
        phase === "transitioning-out"
          ? "opacity-0 pointer-events-none"
          : "opacity-100 pointer-events-auto"
      )}
    >
      {/* Top Subtle Brand Pill */}
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-2xs">
        <Wifi className="size-3.5 text-primary" />
        <span>Offline-Ready Peer-to-Peer Sharing</span>
      </div>

      {/* Center Animated Logo, Branding & Progress / Error State */}
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        {/* Animated Standalone Application Icon with Pulse Rings */}
        <div className="relative flex size-24 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-3xl bg-sky-500/20 duration-1000"
          />
          <span
            aria-hidden="true"
            className="absolute -inset-2 animate-pulse rounded-4xl border border-sky-500/30"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/app-icon.png"
            alt="LetsShare App Icon"
            className="relative size-20 rounded-2xl object-contain shadow-lg select-none"
          />
        </div>

        {/* Main Brand Logo (Light & Dark variants) */}
        <div className="mt-6 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo-light.png"
            alt="LetsShare"
            className="h-8 w-auto object-contain select-none dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo-dark.png"
            alt="LetsShare"
            className="hidden h-8 w-auto object-contain select-none dark:block"
          />
          <span className="sr-only">Droply LetsShare</span>
        </div>
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">
          Direct device-to-device file transfer
        </p>

        {phase !== "error" ? (
          <div className="mt-8 w-full space-y-3">
            {/* Friendly Status Message */}
            <p
              aria-live="polite"
              className="text-sm font-bold text-foreground transition-all duration-200"
            >
              {statusMessage}
            </p>

            {/* Smooth Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-secondary p-0.5">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.max(10, Math.min(100, progress))}%` }}
              />
            </div>

            {/* Animated Activity Dots */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.25s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.12s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary" />
            </div>
          </div>
        ) : (
          <div className="mt-6 flex w-full flex-col items-center rounded-2xl border border-destructive/30 bg-card p-4 text-center shadow-xs">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" />
            </div>
            <h2 className="mt-2.5 text-sm font-bold text-foreground">
              Setup Needed a Moment
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {errorMessage ||
                "We couldn't finish preparing your offline workspace. Please try again."}
            </p>

            <div className="mt-4 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={() => void runInitialization(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-95 touch-manipulation"
              >
                <RefreshCw className="size-3.5" />
                Try Again
              </button>
              <button
                type="button"
                onClick={handleContinueAnyway}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground hover:text-foreground touch-manipulation"
              >
                <span>Continue to App</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Trust & Developer Credit Footer */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>Private • Encrypted • Works Without Internet</span>
        </div>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80">
          Developed by <span className="font-bold text-foreground">Nabeel</span>
        </p>
      </div>
    </div>
  );
}
