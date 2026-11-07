"use client";

import React, { useId, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Image as ImageIcon,
  ClipboardPaste,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { CompactSDP } from "@/lib/types";
import { useQRScanner } from "@/hooks/useQRScanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const readerElementId = `droply-qr-reader-${reactId}`;
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
    <div className="flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <Badge variant="outline">
          {expectedType === "O" ? "Expecting Offer QR" : "Expecting Answer QR"}
        </Badge>
      </div>

      {/* Camera Viewport Container */}
      <div className="relative mt-4 flex min-h-72 flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-zinc-950 text-zinc-100">
        <div
          id={readerElementId}
          className="w-full max-w-sm overflow-hidden rounded-xl"
        />

        {!isScanning && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-400">
              <Camera className="size-7" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-white">
              Camera QR Scanner
            </h4>
            <p className="mt-1 max-w-xs text-xs text-zinc-400">
              Grant camera access to scan the{" "}
              {expectedType === "O"
                ? "Sender's Offer QR code"
                : "Receiver's Answer QR code"}{" "}
              directly from the other device&apos;s screen.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                onClick={() => void startScanner(readerElementId)}
                className="bg-teal-600 text-white hover:bg-teal-500"
              >
                <Camera className="size-4" />
                Start Camera Scan
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              >
                <ImageIcon className="size-4" />
                Scan QR Image
              </Button>
            </div>
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

      {/* Camera Controls when active */}
      {isScanning && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                aria-label="Select camera device"
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void startScanner(readerElementId, selectedCameraId)}
            >
              <RefreshCw className="size-3.5" />
              Restart
            </Button>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void stopScanner()}
          >
            <CameraOff className="size-3.5" />
            Stop Camera
          </Button>
        </div>
      )}

      {/* Multi-frame QR progress bar */}
      {frameProgress.total > 1 && (
        <div className="mt-3 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-teal-700 dark:text-teal-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Scanning Multi-Frame QR Sequence...
            </span>
            <span>
              {frameProgress.received} / {frameProgress.total} frames captured (
              {progressPercentage}%)
            </span>
          </div>
          <Progress value={progressPercentage} className="mt-2 h-2" />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Keep holding the camera steady while the animated QR frames cycle.
          </p>
        </div>
      )}

      {scanError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {/* Offline Manual / Image Fallback Bar */}
      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            No camera or testing on the same computer?
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="size-3" />
              Upload QR PNG
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              <ClipboardPaste className="size-3" />
              {showManualInput ? "Hide Code Input" : "Paste Pairing Code"}
            </Button>
          </div>
        </div>

        {showManualInput && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={`Paste Droply ${
                expectedType === "O" ? "Offer (DP1|...|O|...)" : "Answer (DP1|...|A|...)"
              } code here...`}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-teal-500"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => submitManualCode(manualCode)}
            >
              Apply Code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

