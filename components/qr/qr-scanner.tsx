"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Image as ImageIcon,
  ClipboardPaste,
  AlertCircle,
  CheckCircle2,
  QrCode,
  KeyRound,
  Trash2,
} from "lucide-react";
import { CompactSDP } from "@/lib/types";
import { useQRScanner } from "@/hooks/useQRScanner";
import { validateConnectionCode } from "@/lib/signaling/sdp-compact";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
  const [mode, setMode] = useState<"scan" | "code">("scan");
  const [manualCode, setManualCode] = useState("");

  const {
    isScanning,
    cameras,
    selectedCameraId,
    setSelectedCameraId,
    scanError,
    setScanError,
    frameProgress,
    startScanner,
    stopScanner,
    scanFromImageFile,
    submitManualCode,
  } = useQRScanner({
    expectedType,
    onComplete: onScanComplete,
  });

  const handleSwitchMode = (nextMode: "scan" | "code") => {
    setScanError(null);
    if (nextMode === "code" && isScanning) {
      void stopScanner();
    }
    setMode(nextMode);
  };

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

  const handlePasteFromClipboard = async () => {
    setScanError(null);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setManualCode(text.trim());
        } else {
          setScanError("Clipboard is empty. Copy the connection code from the other device first.");
        }
      } else {
        setScanError("Clipboard access requires permission. Long-press inside the box below to paste.");
      }
    } catch {
      setScanError("Could not read clipboard automatically. Long-press or press Ctrl+V inside the box below to paste.");
    }
  };

  const liveValidation = useMemo(() => {
    if (!manualCode.trim()) return null;
    return validateConnectionCode(manualCode, expectedType);
  }, [manualCode, expectedType]);

  const progressPercentage =
    frameProgress.total > 0
      ? Math.round((frameProgress.received / frameProgress.total) * 100)
      : 0;

  return (
    <div
      data-no-swipe="true"
      className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center"
    >
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

      {/* Mode Switcher: Scan QR vs Connect using Code */}
      <div className="mt-3.5 grid w-full max-w-xs grid-cols-2 rounded-xl border border-border bg-background p-1">
        <button
          type="button"
          onClick={() => handleSwitchMode("scan")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-colors touch-manipulation",
            mode === "scan"
              ? "bg-card text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <QrCode className="size-3.5" />
          Scan QR Code
        </button>
        <button
          type="button"
          onClick={() => handleSwitchMode("code")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-colors touch-manipulation",
            mode === "code"
              ? "bg-card text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <KeyRound className="size-3.5" />
          Connect using Code
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {mode === "scan" ? (
        <>
          <div className="relative mt-4 flex min-h-60 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-neutral-950 text-white">
            <div id={readerElementId} className="w-full overflow-hidden" />

            {!isScanning && (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <button
                  type="button"
                  onClick={() => void startScanner(readerElementId)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-95 touch-manipulation"
                >
                  <Camera className="size-4" />
                  Open Camera
                </button>
                <p className="mt-2.5 text-xs text-neutral-400">
                  Point your camera at the QR code on the other device
                </p>
              </div>
            )}
          </div>

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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 text-xs font-semibold text-foreground touch-manipulation"
              >
                <CameraOff className="size-3.5" />
                Stop Camera
              </button>
            </div>
          )}

          {frameProgress.total > 1 && (
            <div className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span>
                  Scanning Multi-Part QR ({frameProgress.received}/{frameProgress.total})
                </span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="mt-1.5" />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-secondary touch-manipulation"
            >
              <ImageIcon className="size-3.5" />
              Upload QR Image
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode("code")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-secondary touch-manipulation"
            >
              <KeyRound className="size-3.5" />
              Enter Code Manually
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 flex w-full flex-col items-stretch gap-3 text-left">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`code-input-${reactId}`}
              className="text-xs font-bold text-foreground"
            >
              {expectedType === "O"
                ? "Paste Sender Connection Code"
                : "Paste Receiver Response Code"}
            </label>
            <div className="flex items-center gap-1.5">
              {manualCode && (
                <button
                  type="button"
                  onClick={() => {
                    setManualCode("");
                    setScanError(null);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground touch-manipulation"
                >
                  <Trash2 className="size-3" />
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => void handlePasteFromClipboard()}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[11px] font-semibold text-foreground hover:bg-secondary touch-manipulation"
              >
                <ClipboardPaste className="size-3" />
                Paste
              </button>
            </div>
          </div>

          <textarea
            id={`code-input-${reactId}`}
            value={manualCode}
            onChange={(e) => {
              setManualCode(e.target.value);
              if (scanError) setScanError(null);
            }}
            placeholder={
              expectedType === "O"
                ? "DP1|... (Copy from Sender's 'Connect using Code' tab)"
                : "DP1|... (Copy from Receiver's 'Connect using Code' tab)"
            }
            rows={4}
            className="w-full resize-none rounded-xl border border-input bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground break-all outline-none focus:border-primary"
          />

          {liveValidation && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-xl border p-2.5 text-xs",
                liveValidation.valid
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              )}
            >
              {liveValidation.valid ? (
                <>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Valid {expectedType === "O" ? "Sender" : "Receiver"} code ready
                    (Session #{liveValidation.frame?.sessionId} •{" "}
                    {liveValidation.payload?.dev || "Peer Device"}).
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{liveValidation.error}</span>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => submitManualCode(manualCode)}
            disabled={!manualCode.trim()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-40 touch-manipulation"
          >
            <KeyRound className="size-4" />
            Connect with Code
          </button>
        </div>
      )}

      {scanError && (
        <div className="mt-3 flex w-full items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-left text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{scanError}</span>
        </div>
      )}
    </div>
  );
}
