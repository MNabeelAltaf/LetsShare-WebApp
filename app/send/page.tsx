"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  XCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Camera,
  Columns2,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { NetworkStatusBar } from "@/components/network/network-status-bar";
import { FilePicker } from "@/components/files/file-picker";
import { QRDisplay } from "@/components/qr/qr-display";
import { QRScanner } from "@/components/qr/qr-scanner";
import { TransferPanel } from "@/components/transfer/transfer-panel";
import { formatBytes } from "@/lib/file/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SendPage() {
  const {
    role,
    connectionState,
    dataChannelState,
    peerDeviceName,
    selectedFiles,
    totalSelectedBytes,
    addFiles,
    removeFile,
    clearSelectedFiles,
    qrFrames,
    compactCode,
    forceMultiFrame,
    setForceMultiFrame,
    startSenderSession,
    handleAnswerScannedBySender,
    incomingManifest,
    manifestDecision,
    progressList,
    sessionCompleted,
    acceptIncomingTransfer,
    rejectIncomingTransfer,
    controlFile,
    terminateEntireSession,
  } = useDroplySession();

  const [isGeneratingOffer, setIsGeneratingOffer] = useState(false);
  const [handshakeSubStep, setHandshakeSubStep] = useState<
    "show-offer" | "scan-answer" | "both"
  >("show-offer");
  const autoStartedRef = useRef(false);

  const isOfferReady =
    role === "sender" &&
    (connectionState === "awaiting-answer-scan" ||
      connectionState === "connecting") &&
    qrFrames.length > 0;

  const isConnected =
    connectionState === "connected" && dataChannelState === "open";

  const handleGenerateQR = async () => {
    if (selectedFiles.length === 0) return;
    setIsGeneratingOffer(true);
    setHandshakeSubStep("show-offer");
    try {
      await startSenderSession(selectedFiles.length, totalSelectedBytes);
    } finally {
      setIsGeneratingOffer(false);
    }
  };

  // If user dropped/selected files on the Home screen, auto-generate the Offer QR
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("autostart=1") &&
      selectedFiles.length > 0 &&
      connectionState === "idle" &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true;
      window.history.replaceState({}, "", "/send");
      void startSenderSession(selectedFiles.length, totalSelectedBytes);
    }
  }, [
    connectionState,
    selectedFiles.length,
    startSenderSession,
    totalSelectedBytes,
  ]);

  const currentStep = isConnected ? 3 : isOfferReady ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default">Sender Mode</Badge>
            <span className="text-xs text-muted-foreground">
              Direct P2P WebRTC File Transfer
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Send Files
          </h1>
        </div>

        {(isOfferReady || isConnected) && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              autoStartedRef.current = false;
              terminateEntireSession();
            }}
          >
            <XCircle className="size-4" />
            Start Over / Cancel
          </Button>
        )}
      </div>

      <NetworkStatusBar compact />

      {/* 3-Step Progress Stepper */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/80 bg-card p-3">
        {[
          { step: 1, title: "1. Choose Files", desc: "Pick files to share" },
          {
            step: 2,
            title: "2. QR Pairing",
            desc: "Show QR & scan reply",
          },
          {
            step: 3,
            title: "3. Direct Transfer",
            desc: "Fast local P2P stream",
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

      {/* STEP 1: Select Files & Generate Offer QR */}
      {!isOfferReady && !isConnected && (
        <div className="space-y-5">
          <FilePicker
            files={selectedFiles}
            totalBytes={totalSelectedBytes}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            onClearAll={clearSelectedFiles}
            disabled={isGeneratingOffer}
          />

          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:flex-row">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-foreground">
                {selectedFiles.length > 0
                  ? `Ready to share ${selectedFiles.length} ${
                      selectedFiles.length === 1 ? "file" : "files"
                    } (${formatBytes(totalSelectedBytes)})`
                  : "Select at least one file above to generate your QR code"}
              </p>
              <p className="text-xs text-muted-foreground">
                Make sure both devices are on the same Wi-Fi or{" "}
                <Link
                  href="/setup"
                  className="font-medium text-teal-600 underline hover:text-teal-500 dark:text-teal-400"
                >
                  mobile hotspot
                </Link>
                .
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={selectedFiles.length === 0 || isGeneratingOffer}
              onClick={() => void handleGenerateQR()}
              className="w-full sm:w-auto h-11 rounded-xl bg-teal-600 px-6 text-sm font-bold text-white hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
            >
              {isGeneratingOffer ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating QR Code...
                </>
              ) : (
                <>
                  <QrCode className="size-4" />
                  Generate QR Code →
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Super Simple Guided Two-Way QR Handshake */}
      {isOfferReady && !isConnected && (
        <div className="space-y-5">
          {/* Sub-step switcher bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setHandshakeSubStep("show-offer")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                  handshakeSubStep === "show-offer"
                    ? "bg-teal-600 text-white shadow-xs dark:bg-teal-500 dark:text-zinc-950"
                    : "bg-background/80 text-muted-foreground hover:text-foreground"
                )}
              >
                <QrCode className="size-4" />
                Step A: Show Your QR Code
              </button>

              <ArrowRight className="size-4 text-muted-foreground hidden sm:block" />

              <button
                type="button"
                onClick={() => setHandshakeSubStep("scan-answer")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                  handshakeSubStep === "scan-answer"
                    ? "bg-teal-600 text-white shadow-xs dark:bg-teal-500 dark:text-zinc-950"
                    : "bg-background/80 text-muted-foreground hover:text-foreground"
                )}
              >
                <Camera className="size-4" />
                Step B: Scan Receiver&apos;s Reply QR
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() =>
                setHandshakeSubStep(
                  handshakeSubStep === "both" ? "show-offer" : "both"
                )
              }
              className="hidden lg:inline-flex"
            >
              <Columns2 className="size-3.5" />
              {handshakeSubStep === "both"
                ? "Single Step View"
                : "Side-by-Side View"}
            </Button>
          </div>

          {handshakeSubStep === "show-offer" && (
            <div className="mx-auto max-w-xl space-y-4">
              <QRDisplay
                frames={qrFrames}
                compactCode={compactCode}
                title="Step A: Let Receiver Scan This QR Code"
                subtitle="Open 'Receive Files' on the other device and point its camera here"
                forceMultiFrame={forceMultiFrame}
                onToggleMultiFrame={setForceMultiFrame}
              />

              <Button
                type="button"
                size="lg"
                onClick={() => setHandshakeSubStep("scan-answer")}
                className="h-12 w-full rounded-2xl bg-teal-600 text-sm font-bold text-white shadow-sm hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
              >
                <Camera className="size-4" />
                Receiver Scanned It? Tap to Scan Receiver&apos;s Reply QR →
              </Button>
            </div>
          )}

          {handshakeSubStep === "scan-answer" && (
            <div className="mx-auto max-w-xl space-y-4">
              <QRScanner
                expectedType="A"
                title="Step B: Scan the Receiver's Reply QR"
                subtitle="Point your camera at the Answer QR now shown on the receiving device"
                onScanComplete={(answerPayload) => {
                  void handleAnswerScannedBySender(answerPayload);
                }}
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => setHandshakeSubStep("show-offer")}
                className="w-full rounded-xl"
              >
                <ArrowLeft className="size-4" />
                Back to My Offer QR Code
              </Button>
            </div>
          )}

          {handshakeSubStep === "both" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <QRDisplay
                frames={qrFrames}
                compactCode={compactCode}
                title="Step A: Show Sender Offer QR"
                subtitle="Let the receiving device scan this QR code first"
                forceMultiFrame={forceMultiFrame}
                onToggleMultiFrame={setForceMultiFrame}
              />

              <QRScanner
                expectedType="A"
                title="Step B: Scan Receiver Reply QR"
                subtitle="Scan the response QR displayed on the receiver's screen"
                onScanComplete={(answerPayload) => {
                  void handleAnswerScannedBySender(answerPayload);
                }}
              />
            </div>
          )}

          {connectionState === "connecting" && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-teal-500/40 bg-teal-500/10 p-5 text-sm font-medium text-teal-700 dark:text-teal-300">
              <Loader2 className="size-5 animate-spin" />
              <span>
                Connecting directly to {peerDeviceName} over local network...
              </span>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Connected & Streaming Files */}
      {isConnected && (
        <div className="space-y-6">
          <TransferPanel
            role="sender"
            peerDeviceName={peerDeviceName}
            incomingManifest={incomingManifest}
            manifestDecision={manifestDecision}
            progressList={progressList}
            sessionCompleted={sessionCompleted}
            onAcceptManifest={acceptIncomingTransfer}
            onRejectManifest={rejectIncomingTransfer}
            onControlFile={controlFile}
            onStartNewSession={() => {
              autoStartedRef.current = false;
              clearSelectedFiles();
              terminateEntireSession();
            }}
          />

          {sessionCompleted && (
            <div className="flex justify-end">
              <Link
                href="/transfer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:underline dark:text-teal-400"
              >
                View Full Session Summary &amp; Verification Report{" "}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
