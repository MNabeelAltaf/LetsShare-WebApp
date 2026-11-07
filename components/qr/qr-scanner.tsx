"use client";

import React, { useId, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Image as ImageIcon,
  ClipboardPaste,
  AlertCircle,
} from "lucide-react";
import { CompactSDP } from "@/lib/types";
import { useQRScanner } from "@/hooks/useQRScanner";
import { Progress } from "@/components/ui/progress";

interface QRScannerProps {
  expectedType: "O" | "A";
  title: string;
  subtitle: string;
  onScanComplete: (payload: CompactSDP) => void;
}

export function QRScanner({
  expectedType,
  title,
  subtitle,
  onScanComplete,
}: QRScannerProps) {
  const reactId = useId().replace(/:/g, "");
  const readerElementId = `letsshare-qr-reader-${reactId}`;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const {
    isScanning,
    cameras,
    selectedCameraId,
    setSelectedCameraId,
    scanError,
    frameProgress,
    startScanner,
    stopScanner,
    scanFromImageFile,
    submitManualCode,
  } = useQRScanner({
    expectedType,
    onComplete: onScanComplete,
  });

  const handleCameraChange = (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    if (isScanning) {
      void startScanner(readerElementId, newCameraId);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void scanFromImageFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  const progressPercentage =
    frameProgress.total > 0
      ? Math.round((frameProgress.received / frameProgress.total) * 100)
      : 0;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

      <div className="relative mt-4 flex min-h-60 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-neutral-950 text-white">
        <div id={readerElementId} className="w-full overflow-hidden" />

        {!isScanning && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <button
              type="button"
              onClick={() => void startScanner(readerElementId)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-95"
            >
              <Camera className="size-4" />
              Open Camera
            </button>
            <p className="mt-2.5 text-xs text-neutral-400">
              Tap to scan the QR code on the other device
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {isScanning && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => handleCameraChange(e.target.value)}
              aria-label="Select camera"
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => void stopScanner()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 text-xs font-semibold text-foreground"
          >
            <CameraOff className="size-3.5" />
            Stop Camera
          </button>
        </div>
      )}

      {frameProgress.total > 1 && (
        <div className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-left">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span>Scanning QR...</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="mt-1.5" />
        </div>
      )}

      {scanError && (
        <div className="mt-3 flex w-full items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-left text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          <ImageIcon className="size-3.5" />
          Upload QR Image
        </button>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ClipboardPaste className="size-3.5" />
          {showManualInput ? "Hide Code" : "Paste Code"}
        </button>
      </div>

      {showManualInput && (
        <div className="mt-3 flex w-full gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Paste code from the other device..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => submitManualCode(manualCode)}
            className="rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-bold text-background"
          >
            Connect
          </button>
        </div>
      )}
    </div>
  );
}
