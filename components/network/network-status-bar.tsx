"use client";

import React from "react";
import Link from "next/link";
import {
  Wifi,
  WifiOff,
  Radio,
  ShieldAlert,
  CheckCircle2,
  Globe,
  Router,
  Info,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NetworkStatusBar({ compact = false }: { compact?: boolean }) {
  const {
    status,
    signalingMode,
    setSignalingMode,
    connectionState,
    dataChannelState,
    routeType,
    routeDetails,
    peerDeviceName,
    sessionId,
    error,
  } = useDroplySession();

  const isSessionActive = connectionState !== "idle" && connectionState !== "closed";
  const isDataChannelOpen = dataChannelState === "open";

  const connectionLabelMap: Record<typeof connectionState, string> = {
    idle: "Ready to Pair",
    "creating-offer": "Gathering Local ICE Candidates...",
    "awaiting-answer-scan": "Waiting for Receiver Answer QR",
    "processing-offer": "Generating Answer QR...",
    "awaiting-peer-connection": "Answer Ready • Awaiting Sender Scan",
    connecting: "Negotiating Direct P2P Link...",
    connected: `Connected to ${peerDeviceName}`,
    disconnected: "Peer Disconnected",
    failed: "Connection Failed",
    closed: "Session Closed",
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/80 px-4 py-3 text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              "inline-flex size-2.5 rounded-full",
              isDataChannelOpen
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                : connectionState === "failed"
                ? "bg-red-500"
                : isSessionActive
                ? "bg-amber-500 animate-pulse"
                : "bg-teal-500"
            )}
          />
          <span className="font-semibold text-foreground">
            {connectionLabelMap[connectionState]}
          </span>
          {sessionId && (
            <Badge variant="outline" className="font-mono text-[11px]">
              ID: {sessionId}
            </Badge>
          )}
          {isDataChannelOpen && (
            <Badge variant="success">
              DataChannel: Open ({routeType === "direct-lan" ? "Direct Local" : "P2P"})
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              type="button"
              disabled={isSessionActive}
              onClick={() => setSignalingMode("offline-local")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                signalingMode === "offline-local"
                  ? "bg-background text-teal-600 shadow-2xs dark:text-teal-400"
                  : "text-muted-foreground hover:text-foreground",
                isSessionActive && "opacity-60 cursor-not-allowed"
              )}
              title="Strict Offline Mode: Gathers local Wi-Fi / Hotspot host candidates without contacting external STUN servers."
            >
              <Router className="size-3" />
              Local / Hotspot
            </button>
            <button
              type="button"
              disabled={isSessionActive}
              onClick={() => setSignalingMode("online-stun")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                signalingMode === "online-stun"
                  ? "bg-background text-teal-600 shadow-2xs dark:text-teal-400"
                  : "text-muted-foreground hover:text-foreground",
                isSessionActive && "opacity-60 cursor-not-allowed"
              )}
              title="Online STUN Mode: Uses public STUN servers to help discover network paths across different subnets when internet is available."
            >
              <Globe className="size-3" />
              Online STUN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Network & Peer Telemetry
            </h2>
            {status.appCachedOffline ? (
              <Badge variant="success">
                <CheckCircle2 className="size-3" />
                Offline App Cached
              </Badge>
            ) : (
              <Badge variant="warning">
                Caching Assets for Offline Use...
              </Badge>
            )}
            {sessionId && (
              <Badge variant="outline" className="font-mono">
                Session #{sessionId}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Direct WebRTC DataChannel transport. Works over shared Wi-Fi or
            mobile hotspot with mobile data & internet turned OFF.
          </p>
        </div>

        {/* Signaling Mode Switch */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <span className="text-xs font-medium text-muted-foreground">
            ICE Mode:
          </span>
          <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
            <button
              type="button"
              disabled={isSessionActive}
              onClick={() => setSignalingMode("offline-local")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                signalingMode === "offline-local"
                  ? "bg-background text-teal-600 shadow-2xs dark:text-teal-400"
                  : "text-muted-foreground hover:text-foreground",
                isSessionActive && "opacity-60 cursor-not-allowed"
              )}
            >
              <Router className="size-3.5" />
              Offline LAN / Hotspot
            </button>
            <button
              type="button"
              disabled={isSessionActive}
              onClick={() => setSignalingMode("online-stun")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                signalingMode === "online-stun"
                  ? "bg-background text-teal-600 shadow-2xs dark:text-teal-400"
                  : "text-muted-foreground hover:text-foreground",
                isSessionActive && "opacity-60 cursor-not-allowed"
              )}
            >
              <Globe className="size-3.5" />
              Online STUN
            </button>
          </div>
        </div>
      </div>

      {/* 4 Telemetry Pillars */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>WebRTC State</span>
            <Radio
              className={cn(
                "size-3.5",
                connectionState === "connected"
                  ? "text-emerald-500"
                  : connectionState === "failed"
                  ? "text-red-500"
                  : "text-teal-500"
              )}
            />
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {connectionLabelMap[connectionState]}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {routeDetails ||
              (signalingMode === "offline-local"
                ? "Zero external STUN/TURN servers"
                : "STUN candidate discovery enabled")}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>RTCDataChannel</span>
            <span
              className={cn(
                "inline-block size-2 rounded-full",
                dataChannelState === "open"
                  ? "bg-emerald-500"
                  : dataChannelState === "connecting"
                  ? "bg-amber-500"
                  : "bg-zinc-400"
              )}
            />
          </div>
          <p className="mt-1 text-sm font-semibold capitalize text-foreground">
            {dataChannelState}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {dataChannelState === "open"
              ? "Ready for 64 KB chunk streaming"
              : "Opens automatically after QR handshake"}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Network AdapterHint</span>
            {status.browserOnline ? (
              <Wifi className="size-3.5 text-teal-500" />
            ) : (
              <WifiOff className="size-3.5 text-amber-500" />
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {status.browserOnline ? "Adapter Active" : "Offline / Local Only"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Note: Browser online status does not prove internet access.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Hotspot / Wi-Fi Setup</span>
            <Info className="size-3.5 text-teal-500" />
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Same Subnet Required
          </p>
          <Link
            href="/setup"
            className="mt-0.5 inline-block text-[11px] font-medium text-teal-600 underline-offset-2 hover:underline dark:text-teal-400"
          >
            Open Hotspot Setup Guide →
          </Link>
        </div>
      </div>

      {!status.isSecureContext && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <span className="font-semibold">Non-HTTPS Context Detected:</span>{" "}
            Browsers restrict Service Workers and direct Camera access (`getUserMedia`) on
            insecure origins outside `localhost`. You can still pair using QR Image
            Uploads or Pairing Codes.
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <span className="font-semibold">Connection Diagnostic:</span> {error}
          </div>
        </div>
      )}
    </div>
  );
}

