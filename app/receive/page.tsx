"use client";

import React from "react";
import { X, Check, Loader2 } from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { QRScanner } from "@/components/qr/qr-scanner";
import { QRDisplay } from "@/components/qr/qr-display";
import { TransferPanel } from "@/components/transfer/transfer-panel";
import { cn } from "@/lib/utils";

export default function ReceivePage() {
  const {
    role,
    connectionState,
    dataChannelState,
    peerDeviceName,
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
    error,
  } = useDroplySession();

  const isAnswerReady =
    role === "receiver" &&
    connectionState === "awaiting-peer-connection" &&
    qrFrames.length > 0;

  const isConnected =
    connectionState === "connected" && dataChannelState === "open";

  const currentStep = isConnected ? 3 : isAnswerReady ? 2 : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          Receive Files
        </h1>

        {(isAnswerReady || isConnected) && (
          <button
            type="button"
            onClick={terminateEntireSession}
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
          { step: 1, label: "1. Scan" },
          { step: 2, label: "2. Reply" },
          { step: 3, label: "3. Save" },
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

      {/* STEP 1: Scan Sender's QR Code */}
      {!isAnswerReady && !isConnected && (
        <QRScanner
          expectedType="O"
          title="1. Scan Sender's QR Code"
          subtitle="Point your camera at the QR code shown on the sending device"
          onScanComplete={(offerPayload) => {
            void handleOfferScannedByReceiver(offerPayload);
          }}
        />
      )}

      {/* STEP 2: Show Reply QR to Sender */}
      {isAnswerReady && !isConnected && (
        <div className="space-y-3">
          <QRDisplay
            frames={qrFrames}
            compactCode={compactCode}
            title="2. Show this Reply QR to Sender"
            subtitle="Ask the sender to tap 'Next: Scan Reply QR' and scan this code"
            forceMultiFrame={forceMultiFrame}
            onToggleMultiFrame={setForceMultiFrame}
          />

          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-3.5 text-xs font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Waiting for sender to scan this QR...</span>
          </div>
        </div>
      )}

      {/* STEP 3: Accept & Save Files */}
      {isConnected && (
        <div className="space-y-4">
          {!incomingManifest && progressList.length === 0 && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-6 text-xs font-bold text-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Connected! Loading files...</span>
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
        </div>
      )}
    </div>
  );
}
