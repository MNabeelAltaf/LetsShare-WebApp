"use client";

import React, { useState } from "react";
import {
  Smartphone,
  Laptop,
  CheckCircle2,
  Download,
  X,
  Share,
  PlusSquare,
  MoreVertical,
  WifiOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function InstallAppModal() {
  const {
    status,
    canInstallPWA,
    isInstalledPWA,
    isInstallModalOpen,
    setIsInstallModalOpen,
    promptInstallPWA,
    precacheAllRoutes,
    isPrecaching,
  } = useDroplySession();

  const [selectedDevice, setSelectedDevice] = useState<
    "android" | "ios" | "desktop"
  >("android");

  if (!isInstallModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
        <button
          type="button"
          onClick={() => setIsInstallModalOpen(false)}
          aria-label="Close install dialog"
          className="absolute top-4 right-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm dark:bg-teal-500 dark:text-zinc-950">
            <Download className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="install-modal-title"
                className="text-lg font-bold tracking-tight text-foreground"
              >
                Install Droply App
              </h2>
              <Badge variant="default">Offline PWA</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Launch anytime from your home screen or desktop — even with zero
              internet.
            </p>
          </div>
        </div>

        {/* Step 1: Offline Asset Caching Status */}
        <div className="mt-5 rounded-2xl border border-border/80 bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {status.appCachedOffline ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              ) : (
                <WifiOff className="size-5 shrink-0 text-amber-500" />
              )}
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {status.appCachedOffline
                    ? "All App Pages Cached for Offline Startup"
                    : "Prepare App for Offline Use"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {status.appCachedOffline
                    ? "Send, Receive, and Hotspot screens are saved in browser storage."
                    : "Click to save all pages locally so Droply opens without internet."}
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="xs"
              variant={status.appCachedOffline ? "outline" : "default"}
              disabled={isPrecaching}
              onClick={() => void precacheAllRoutes()}
            >
              {isPrecaching ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Caching...
                </>
              ) : status.appCachedOffline ? (
                "Re-verify Cache"
              ) : (
                "Cache Offline Now"
              )}
            </Button>
          </div>
        </div>

        {/* Native 1-Click Install Button when browser supports beforeinstallprompt */}
        {canInstallPWA && (
          <div className="mt-4 rounded-2xl border-2 border-teal-500/50 bg-teal-500/10 p-4">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-foreground sm:justify-start">
                  <Sparkles className="size-4 text-teal-500" />
                  One-Click Install Ready
                </p>
                <p className="text-xs text-muted-foreground">
                  Your browser supports direct standalone installation.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => void promptInstallPWA()}
                className="w-full sm:w-auto bg-teal-600 text-white hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
              >
                <Download className="size-4" />
                Install Droply Now
              </Button>
            </div>
          </div>
        )}

        {isInstalledPWA && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Droply is already installed and running as a standalone app!
            </span>
          </div>
        )}

        {/* Platform Instructions for Android, iOS, and Desktop */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              How to install on your device:
            </span>
            <div className="inline-flex rounded-xl border border-border bg-muted/50 p-0.5">
              {(
                [
                  { id: "android", label: "Android", icon: Smartphone },
                  { id: "ios", label: "iPhone / iPad", icon: Smartphone },
                  { id: "desktop", label: "PC / Mac", icon: Laptop },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedDevice(tab.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                      selectedDevice === tab.id
                        ? "bg-background text-teal-600 shadow-2xs dark:text-teal-400"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDevice === "android" && (
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 font-bold text-teal-600 dark:text-teal-400">
                  1
                </span>
                <p className="text-foreground/90">
                  Tap the <strong>Install Droply Now</strong> button above, or
                  tap the browser menu icon{" "}
                  <MoreVertical className="inline size-3.5 text-teal-500" /> in
                  Chrome.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 font-bold text-teal-600 dark:text-teal-400">
                  2
                </span>
                <p className="text-foreground/90">
                  Select <strong>Install app</strong> or{" "}
                  <strong>Add to Home screen</strong>. Droply will appear in
                  your app drawer and work offline.
                </p>
              </div>
            </div>
          )}

          {selectedDevice === "ios" && (
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 font-bold text-teal-600 dark:text-teal-400">
                  1
                </span>
                <p className="text-foreground/90">
                  In Safari on iPhone or iPad, tap the{" "}
                  <strong>Share</strong> button{" "}
                  <Share className="inline size-3.5 text-teal-500" /> at the
                  bottom of the screen.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 font-bold text-teal-600 dark:text-teal-400">
                  2
                </span>
                <p className="text-foreground/90">
                  Scroll down and tap{" "}
                  <strong>Add to Home Screen</strong>{" "}
                  <PlusSquare className="inline size-3.5 text-teal-500" />, then
                  tap <strong>Add</strong>.
                </p>
              </div>
            </div>
          )}

          {selectedDevice === "desktop" && (
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 font-bold text-teal-600 dark:text-teal-400">
                  1
                </span>
                <p className="text-foreground/90">
                  In Chrome, Edge, or Brave, click the{" "}
                  <strong>Install Droply</strong> icon{" "}
                  <Download className="inline size-3.5 text-teal-500" /> on the
                  right side of your address bar (or click{" "}
                  <strong>Install Droply Now</strong> above).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 font-bold text-teal-600 dark:text-teal-400">
                  2
                </span>
                <p className="text-foreground/90">
                  Confirm <strong>Install</strong> to launch Droply in its own
                  standalone desktop window with full offline support.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsInstallModalOpen(false)}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

