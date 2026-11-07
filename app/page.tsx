"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send,
  Download,
  Wifi,
  ShieldCheck,
  QrCode,
  Zap,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Smartphone,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { NetworkStatusBar } from "@/components/network/network-status-bar";
import { formatBytes, formatDuration } from "@/lib/file/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingQuick, setIsDraggingQuick] = useState(false);
  const [showAdvancedNetwork, setShowAdvancedNetwork] = useState(false);

  const {
    role,
    status,
    connectionState,
    selectedFiles,
    totalSelectedBytes,
    addFiles,
    progressList,
    recentSessions,
    clearHistory,
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
    <div className="space-y-7">
      {/* Active Session Resume Bar */}
      {hasActiveSession && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-teal-500/50 bg-teal-500/10 p-4 shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge variant="default">Active {role.toUpperCase()} Session</Badge>
              <span className="text-sm font-semibold text-foreground">
                Status: {connectionState}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              You have an ongoing file transfer session ({progressList.length}{" "}
              files). Tap to return or end the session.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={role === "receiver" ? "/receive" : "/send"}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-xs font-semibold text-white hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
            >
              Resume Session <ArrowRight className="size-3.5" />
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={terminateEntireSession}
            >
              End Session
            </Button>
          </div>
        </div>
      )}

      {/* Simple Hero + 2 Giant Action Cards */}
      <section className="space-y-5">
        <div className="flex flex-col items-center text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
            <QrCode className="size-3.5" />
            <span>No Internet Required • Direct Device-to-Device</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Share files with a{" "}
            <span className="text-teal-600 dark:text-teal-400">QR scan.</span>
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Pick files on one device, scan the QR code on the other. Works over
            shared Wi-Fi or a mobile hotspot with mobile data turned off.
          </p>
        </div>

        {/* Two Giant Primary Cards: SEND & RECEIVE */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Giant SEND Card with instant Drag & Drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingQuick(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingQuick(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingQuick(false);
              handleQuickFilesChosen(e.dataTransfer.files);
            }}
            className={`group relative flex flex-col justify-between rounded-3xl border-2 p-6 sm:p-8 transition-all ${
              isDraggingQuick
                ? "border-teal-500 bg-teal-500/15 scale-[1.01]"
                : "border-teal-500/40 bg-card hover:border-teal-500 hover:shadow-lg"
            }`}
          >
            <input
              ref={quickFileInputRef}
              type="file"
              multiple
              onChange={(e) => handleQuickFilesChosen(e.target.files)}
              className="hidden"
            />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm dark:bg-teal-500 dark:text-zinc-950">
                  <Send className="size-7" />
                </div>
                <Badge variant="default">Step 1 on Sender</Badge>
              </div>

              <h2 className="mt-5 text-2xl font-bold text-foreground">
                Send Files
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Select photos, videos, PDFs, or any file from your device. Droply
                instantly generates a QR code for the other device to scan.
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <Button
                type="button"
                size="lg"
                onClick={() => quickFileInputRef.current?.click()}
                className="h-12 w-full rounded-2xl bg-teal-600 text-base font-bold text-white shadow-sm hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
              >
                <UploadCloud className="size-5" />
                Choose Files &amp; Create QR
              </Button>

              {selectedFiles.length > 0 ? (
                <Link
                  href="/send"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-600 hover:underline dark:text-teal-400 py-1"
                >
                  Continue with {selectedFiles.length} selected{" "}
                  {selectedFiles.length === 1 ? "file" : "files"} (
                  {formatBytes(totalSelectedBytes)}) →
                </Link>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  Or drag &amp; drop files directly onto this card
                </p>
              )}
            </div>
          </div>

          {/* Giant RECEIVE Card */}
          <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-border/90 bg-card p-6 sm:p-8 transition-all hover:border-teal-500/60 hover:shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
                  <Download className="size-7" />
                </div>
                <Badge variant="secondary">Step 2 on Receiver</Badge>
              </div>

              <h2 className="mt-5 text-2xl font-bold text-foreground">
                Receive Files
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Open the camera scanner to scan the sender&apos;s QR code, show
                your reply QR, and save incoming files directly to your device.
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <Link
                href="/receive"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-teal-500/50 bg-teal-500/10 text-base font-bold text-teal-700 transition-colors hover:bg-teal-500/20 dark:text-teal-300"
              >
                <QrCode className="size-5" />
                Open QR Scanner to Receive
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Supports camera scan, QR screenshot upload, or pairing code
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prominent Install App & Offline Readiness Banner */}
      <section className="rounded-3xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 via-card to-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white dark:bg-teal-500 dark:text-zinc-950">
              <Smartphone className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {isInstalledPWA
                    ? "Droply is Installed on Your Device"
                    : "Install Droply App for 100% Offline Sharing"}
                </h3>
                {status.appCachedOffline && (
                  <Badge variant="success">
                    <CheckCircle2 className="size-3" />
                    Offline Ready
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                {isInstalledPWA
                  ? "All pages are cached locally. You can turn off mobile data & Wi-Fi internet and launch Droply anytime from your home screen."
                  : "Install Droply as an app on your phone or laptop so it opens instantly without internet whenever you want to share files over a hotspot."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <Button
              type="button"
              onClick={() => {
                if (canInstallPWA) {
                  void promptInstallPWA();
                } else {
                  setIsInstallModalOpen(true);
                }
              }}
              className="bg-teal-600 text-white hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950 font-semibold"
            >
              <Sparkles className="size-4" />
              {isInstalledPWA ? "Offline & Install Info" : "Install App"}
            </Button>
            <Link
              href="/setup"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <Wifi className="size-3.5 text-teal-500" />
              Hotspot Guide
            </Link>
          </div>
        </div>
      </section>

      {/* Simple 3-Step Visual Strip */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-xs font-bold text-teal-600 dark:text-teal-400">
            1
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Same Wi-Fi or Hotspot
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Connect both devices to the same Wi-Fi router or turn on your
              phone&apos;s Wi-Fi hotspot (mobile data OFF).
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-xs font-bold text-teal-600 dark:text-teal-400">
            2
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Scan Offer &amp; Reply QR
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Receiver scans the Sender&apos;s QR code, then Sender scans the
              Receiver&apos;s reply QR code.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-xs font-bold text-teal-600 dark:text-teal-400">
            3
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Instant Direct Transfer
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Files stream directly between devices at local Wi-Fi speed with
              automatic SHA-256 verification.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Transfers (Only shown cleanly when transfers exist, or compact empty state) */}
      {recentSessions.length > 0 && (
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Transfers
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void clearHistory()}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>

          <div className="mt-3 space-y-2.5">
            {recentSessions.slice(0, 3).map((session) => (
              <div
                key={session.sessionId}
                className="flex flex-col justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      session.role === "sender" ? "default" : "secondary"
                    }
                  >
                    {session.role === "sender" ? "Sent" : "Received"}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {session.filesCount}{" "}
                    {session.filesCount === 1 ? "file" : "files"} (
                    {formatBytes(session.totalSize)})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {formatDuration(session.durationSeconds)} at{" "}
                    {session.averageSpeedMBps} MB/s
                  </span>
                </div>

                {session.allVerified && (
                  <Badge variant="success">
                    <ShieldCheck className="size-3" />
                    SHA-256 Verified
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Collapsible Advanced Network & WebRTC Diagnostics */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvancedNetwork(!showAdvancedNetwork)}
          className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Zap className="size-3.5 text-teal-500" />
            Network Diagnostics &amp; ICE Connection Settings (Local Hotspot vs
            Online STUN)
          </span>
          {showAdvancedNetwork ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        {showAdvancedNetwork && <NetworkStatusBar />}
      </section>
    </div>
  );
}
