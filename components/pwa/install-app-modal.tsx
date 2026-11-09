"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Download,
  X,
  Share,
  PlusSquare,
  MoreVertical,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InstallAppModal() {
  const {
    canInstallPWA,
    isInstalledPWA,
    isInstallModalOpen,
    setIsInstallModalOpen,
    promptInstallPWA,
  } = useDroplySession();

  const [selectedDevice, setSelectedDevice] = useState<
    "android" | "ios" | "desktop"
  >("android");

  if (!isInstallModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl">
        <button
          type="button"
          onClick={() => setIsInstallModalOpen(false)}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/app-icon.png"
            alt="LetsShare Icon"
            className="size-11 rounded-xl object-contain shadow-xs select-none"
          />
          <div>
            <h2
              id="install-modal-title"
              className="text-base font-bold text-foreground"
            >
              Install LetsShare
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add LetsShare to your home screen so it opens without internet.
            </p>
          </div>
        </div>

        {canInstallPWA && (
          <Button
            type="button"
            size="lg"
            onClick={() => void promptInstallPWA()}
            className="mt-4 h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90"
          >
            <Download className="size-4" />
            Install App Now
          </Button>
        )}

        {isInstalledPWA && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>LetsShare is installed on your device.</span>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
            {(
              [
                { id: "android", label: "Android" },
                { id: "ios", label: "iPhone" },
                { id: "desktop", label: "Computer" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedDevice(tab.id)}
                className={cn(
                  "rounded-md py-1.5 text-xs font-semibold transition-all",
                  selectedDevice === tab.id
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {selectedDevice === "android" && (
            <div className="rounded-xl border border-border bg-background p-3.5 text-xs space-y-2">
              <p>
                1. Tap the{" "}
                <MoreVertical className="inline size-3.5" /> menu at the
                top-right of Chrome.
              </p>
              <p>
                2. Tap <strong>Install app</strong> or{" "}
                <strong>Add to Home screen</strong>.
              </p>
            </div>
          )}

          {selectedDevice === "ios" && (
            <div className="rounded-xl border border-border bg-background p-3.5 text-xs space-y-2">
              <p>
                1. Tap <strong>Share</strong>{" "}
                <Share className="inline size-3.5" /> at the bottom of Safari.
              </p>
              <p>
                2. Tap <strong>Add to Home Screen</strong>{" "}
                <PlusSquare className="inline size-3.5" />.
              </p>
            </div>
          )}

          {selectedDevice === "desktop" && (
            <div className="rounded-xl border border-border bg-background p-3.5 text-xs space-y-2">
              <p>
                1. Click the <strong>Install</strong> icon{" "}
                <Download className="inline size-3.5" /> in your browser address
                bar.
              </p>
              <p>
                2. Click <strong>Install</strong> to confirm.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
