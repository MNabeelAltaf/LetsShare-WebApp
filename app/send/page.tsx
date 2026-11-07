"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  QrCode,
  X,
  Loader2,
  Check,
  ArrowLeft,
  Camera,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { FilePicker } from "@/components/files/file-picker";
import { QRDisplay } from "@/components/qr/qr-display";
import { QRScanner } from "@/components/qr/qr-scanner";
import { TransferPanel } from "@/components/transfer/transfer-panel";
import { formatBytes } from "@/lib/file/format";
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
    error,
  } = useDroplySession();

  const [isGeneratingOffer, setIsGeneratingOffer] = useState(false);
  const [handshakeSubStep, setHandshakeSubStep] = useState<
    "show-offer" | "scan-answer"
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          Send Files
        </h1>

        {(isOfferReady || isConnected) && (
          <button
            type="button"
            onClick={() => {
              autoStartedRef.current = false;
              terminateEntireSession();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Cancel
          </button>
        )}
      </div>

      {/* Clean Non-Truncating 3-Step Tab Strip */}
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-card text-center">
        {[
          { step: 1, label: "1. Files" },
          { step: 2, label: "2. QR Code" },
          { step: 3, label: "3. Send" },
        ].map((item) => {
          const active = currentStep === item.step;
          const done = currentStep > item.step;
          return (
            <div
              key={item.step}
              className={cn(
                "flex items-center justify-center gap-1.5 border-r border-border py-2.5 last:border-r-0 text-xs font-bold whitespace-nowrap",
                active
                  ? "bg-foreground text-background"
                  : done
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {done && <Check className="size-3.5 text-primary" />}
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {/* STEP 1: Choose Files */}
      {!isOfferReady && !isConnected && (
        <div className="space-y-4">
          <FilePicker
            files={selectedFiles}
            totalBytes={totalSelectedBytes}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
            onClearAll={clearSelectedFiles}
            disabled={isGeneratingOffer}
          />

          {selectedFiles.length > 0 && (
            <button
              type="button"
              disabled={isGeneratingOffer}
              onClick={() => void handleGenerateQR()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {isGeneratingOffer ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating QR Code...
                </>
              ) : (
                <>
                  <QrCode className="size-4" />
                  Create QR Code ({formatBytes(totalSelectedBytes)})
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* STEP 2: QR Handshake */}
      {isOfferReady && !isConnected && (
        <div className="space-y-4">
          {handshakeSubStep === "show-offer" ? (
            <div className="space-y-3">
              <QRDisplay
                frames={qrFrames}
                compactCode={compactCode}
                title="Step 1: Let Receiver scan this QR"
                subtitle="Open LetsShare → Receive on the other device and scan this code"
                forceMultiFrame={forceMultiFrame}
                onToggleMultiFrame={setForceMultiFrame}
              />

              <button
                type="button"
                onClick={() => setHandshakeSubStep("scan-answer")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-95"
              >
                <Camera className="size-4" />
                Next: Scan Reply QR →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <QRScanner
                expectedType="A"
                title="Step 2: Scan Reply QR"
                subtitle="Scan the QR code now shown on the receiving device"
                onScanComplete={(answerPayload) => {
                  void handleAnswerScannedBySender(answerPayload);
                }}
              />

              <button
                type="button"
                onClick={() => setHandshakeSubStep("show-offer")}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-bold text-foreground hover:bg-secondary"
              >
                <ArrowLeft className="size-4" />
                Back to My QR Code
              </button>
            </div>
          )}

          {connectionState === "connecting" && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-xs font-bold text-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Connecting to {peerDeviceName}...</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Sending Files */}
      {isConnected && (
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
      )}
    </div>
  );
}
