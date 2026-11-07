"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wifi,
  ChevronRight,
  Check,
  Download,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { formatBytes } from "@/lib/file/format";

export default function DashboardPage() {
  const router = useRouter();
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    role,
    connectionState,
    addFiles,
    recentSessions,
    terminateEntireSession,
    canInstallPWA,
    isInstalledPWA,
    promptInstallPWA,
    setIsInstallModalOpen,
  } = useDroplySession();

  const hasActiveSession =
    connectionState !== "idle" && connectionState !== "closed";

  const handleQuickFilesChosen = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    addFiles(files);
    router.push("/send?autostart=1");
  };

  return (
    <div className="space-y-6">
      {/* Ongoing session bar */}
      {hasActiveSession && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/20 bg-card p-3.5">
          <span className="text-xs font-bold text-foreground">
            Transfer session active
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={role === "receiver" ? "/receive" : "/send"}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={terminateEntireSession}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              End
            </button>
          </div>
        </div>
      )}

      {/* Left-aligned Editorial Header */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Local File Transfer
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          What would you like to do?
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Share files directly over Wi-Fi or Hotspot without mobile data.
        </p>
      </div>

      {/* Main Action Stack: Crisp Tactile Cards */}
      <div className="space-y-3">
        <input
          ref={quickFileInputRef}
          type="file"
          multiple
          onChange={(e) => handleQuickFilesChosen(e.target.files)}
          className="hidden"
        />

        {/* SEND ACTION */}
        <button
          type="button"
          onClick={() => quickFileInputRef.current?.click()}
          className="group flex w-full items-center justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-foreground/40 active:scale-[0.995]"
        >
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">
                01
              </span>
              <h2 className="text-lg font-bold text-foreground">Send Files</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose photos, videos, or documents and show a QR code.
            </p>
          </div>

          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRight className="size-5" />
          </span>
        </button>

        {/* RECEIVE ACTION */}
        <Link
          href="/receive"
          className="group flex w-full items-center justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-foreground/40 active:scale-[0.995]"
        >
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">
                02
              </span>
              <h2 className="text-lg font-bold text-foreground">
                Receive Files
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Scan the sender&apos;s QR code with your camera to get files.
            </p>
          </div>

          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-transform group-hover:translate-y-0.5">
            <ArrowDownLeft className="size-5" />
          </span>
        </Link>
      </div>

      {/* Utility Rows: Hotspot Help & Install App */}
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        <Link
          href="/setup"
          className="flex items-center justify-between px-4 py-3.5 text-xs transition-colors hover:bg-secondary/50"
        >
          <div className="flex items-center gap-3">
            <Wifi className="size-4 text-primary" />
            <div>
              <p className="font-bold text-foreground">
                How to connect via Phone Hotspot
              </p>
              <p className="text-[11px] text-muted-foreground">
                Use when you don&apos;t have a Wi-Fi router nearby
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>

        {!isInstalledPWA && (
          <button
            type="button"
            onClick={() => {
              if (canInstallPWA) {
                void promptInstallPWA();
              } else {
                setIsInstallModalOpen(true);
              }
            }}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left text-xs transition-colors hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <Download className="size-4 text-primary" />
              <div>
                <p className="font-bold text-foreground">
                  Install LetsShare App
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Save to your phone or computer so it works offline
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Recent Transfers */}
      {recentSessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Recent
          </p>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {recentSessions.slice(0, 3).map((session) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between px-4 py-3 text-xs"
              >
                <span className="font-semibold text-foreground">
                  {session.role === "sender" ? "Sent" : "Received"}{" "}
                  {session.filesCount}{" "}
                  {session.filesCount === 1 ? "file" : "files"} (
                  {formatBytes(session.totalSize)})
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                  <Check className="size-3.5" />
                  Saved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
