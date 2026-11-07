"use client";

import React from "react";
import Link from "next/link";
import {
  XCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  FileStack,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { NetworkStatusBar } from "@/components/network/network-status-bar";
import { QRScanner } from "@/components/qr/qr-scanner";
import { QRDisplay } from "@/components/qr/qr-display";
import { TransferPanel } from "@/components/transfer/transfer-panel";
import { formatBytes } from "@/lib/file/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ReceivePage() {
  const {
    role,
    connectionState,
    dataChannelState,
    peerDeviceName,
    offerPreview,
    qrFrames,
    compactCode,
    forceMultiFrame,
    setForceMultiFrame,
    handleOfferScannedByReceiver,
    incomingManifest,
    manifestDecision,
    progressList,
    sessionCompleted,
    acceptIncomingTransfer,
    rejectIncomingTransfer,
    controlFile,
    terminateEntireSession,
  } = useDroplySession();

  const isAnswerReady =
    role === "receiver" &&
    connectionState === "awaiting-peer-connection" &&
    qrFrames.length > 0;

  const isConnected =
    connectionState === "connected" && dataChannelState === "open";

  const currentStep = isConnected ? 3 : isAnswerReady ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default">Receiver Mode</Badge>
            <span className="text-xs text-muted-foreground">
              Direct P2P WebRTC File Receiver
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Receive Files via QR Pairing
          </h1>
        </div>

        {(isAnswerReady || isConnected) && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={terminateEntireSession}
          >
            <XCircle className="size-4" />
            Cancel Session
          </Button>
        )}
      </div>

      <NetworkStatusBar compact />

      {/* 3-Step Progress Stepper */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/80 bg-card p-3">
        {[
          {
            step: 1,
            title: "1. Scan Offer QR",
            desc: "Scan sender's QR code",
          },
          {
            step: 2,
            title: "2. Show Answer QR",
            desc: "Let sender scan response",
          },
          {
            step: 3,
            title: "3. Accept & Save",
            desc: "Verify SHA-256 & download",
          },
        ].map((item) => {
          const active = currentStep === item.step;
          const done = currentStep > item.step;
          return (
            <div
              key={item.step}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
                active
                  ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30"
                  : done
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  active
                    ? "bg-teal-600 text-white dark:bg-teal-400 dark:text-zinc-950"
                    : done
                    ? "bg-emerald-500/20 text-emerald-500"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <CheckCircle2 className="size-4" /> : item.step}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{item.title}</p>
                <p className="hidden truncate text-[11px] opacity-80 sm:block">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Scan Sender's Offer QR */}
      {!isAnswerReady && !isConnected && (
        <div className="mx-auto max-w-2xl space-y-4">
          <QRScanner
            expectedType="O"
            title="Step 1: Scan Sender's Offer QR Code"
            subtitle="Point your camera at the QR code displayed on the sending device"
            onScanComplete={(offerPayload) => {
              void handleOfferScannedByReceiver(offerPayload);
            }}
          />
        </div>
      )}

      {/* STEP 2: Display Receiver Answer QR for Sender to Scan */}
      {isAnswerReady && !isConnected && (
        <div className="mx-auto max-w-2xl space-y-5">
          {offerPreview && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4">
              <div className="flex items-center gap-3">
                <FileStack className="size-5 text-teal-500" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Pairing with {peerDeviceName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Incoming session: {offerPreview.fileCount}{" "}
                    {offerPreview.fileCount === 1 ? "file" : "files"} •{" "}
                    {formatBytes(offerPreview.totalBytes)} total
                  </p>
                </div>
              </div>
              <Badge variant="default">Offer Decoded</Badge>
            </div>
          )}

          <QRDisplay
            frames={qrFrames}
            compactCode={compactCode}
            title="Step 2: Show Answer QR to Sender"
            subtitle="Ask the sender to scan this response QR code to complete the P2P link"
            forceMultiFrame={forceMultiFrame}
            onToggleMultiFrame={setForceMultiFrame}
          />

          <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-card p-4 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-teal-500" />
            <span>
              Waiting for {peerDeviceName} to scan this Answer QR and open the
              direct WebRTC DataChannel...
            </span>
          </div>
        </div>
      )}

      {/* STEP 3: Connected -> Inspect Manifest, Accept/Reject, Receive & Download */}
      {isConnected && (
        <div className="space-y-6">
          {!incomingManifest && progressList.length === 0 && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-6 text-sm font-medium text-teal-700 dark:text-teal-300">
              <Loader2 className="size-5 animate-spin" />
              <span>
                Connected to {peerDeviceName}! Waiting for incoming file
                manifest and SHA-256 metadata...
              </span>
            </div>
          )}

          <TransferPanel
            role="receiver"
            peerDeviceName={peerDeviceName}
            incomingManifest={incomingManifest}
            manifestDecision={manifestDecision}
            progressList={progressList}
            sessionCompleted={sessionCompleted}
            onAcceptManifest={acceptIncomingTransfer}
            onRejectManifest={rejectIncomingTransfer}
            onControlFile={controlFile}
            onStartNewSession={terminateEntireSession}
          />

          {sessionCompleted && (
            <div className="flex justify-end">
              <Link
                href="/transfer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:underline dark:text-teal-400"
              >
                Open Full Transfer Summary & Verification Report{" "}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

