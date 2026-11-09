"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CompactSDP } from "@/lib/types";
import {
  QRFrameAssembler,
  validateConnectionCode,
} from "@/lib/signaling/sdp-compact";
import { decodeQRFromImageFile } from "@/lib/qr/qr-service";

export interface CameraDevice {
  id: string;
  label: string;
}

export interface UseQRScannerOptions {
  expectedType?: "O" | "A";
  onComplete: (payload: CompactSDP) => void;
}

/**
 * Explicitly stops any MediaStreamTracks attached to `<video>` elements inside the scanner container
 * to guarantee zero orphaned camera streams on mobile Safari / Chrome.
 */
function stopContainerVideoTracks(elementId: string | null): void {
  if (!elementId || typeof document === "undefined") return;
  const container = document.getElementById(elementId);
  if (!container) return;
  const videos = container.querySelectorAll("video");
  videos.forEach((video) => {
    try {
      const stream = video.srcObject as MediaStream | null;
      if (stream && typeof stream.getTracks === "function") {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore track stop errors
          }
        });
      }
      video.srcObject = null;
    } catch {
      // Ignore video cleanup errors
    }
  });
}

export function useQRScanner({ expectedType, onComplete }: UseQRScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | "unsupported"
  >("prompt");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [frameProgress, setFrameProgress] = useState<{
    received: number;
    total: number;
  }>({ received: 0, total: 0 });

  const assemblerRef = useRef<QRFrameAssembler>(new QRFrameAssembler());
  const scannerInstanceRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
    isScanning?: boolean;
  } | null>(null);
  const activeElementIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const stopScanner = useCallback(async () => {
    const instance = scannerInstanceRef.current;
    const elemId = activeElementIdRef.current;
    scannerInstanceRef.current = null;
    setIsScanning(false);

    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch {
        // Ignore stop errors if already stopped
      }
      try {
        instance.clear();
      } catch {
        // Ignore clear errors
      }
    }

    stopContainerVideoTracks(elemId);
  }, []);

  // Stop camera on unmount or when tab/app goes into background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && scannerInstanceRef.current) {
        void stopScanner();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void stopScanner();
    };
  }, [stopScanner]);

  const handleDecodedString = useCallback(
    (rawText: string): boolean => {
      if (completedRef.current) return true;
      try {
        const res = assemblerRef.current.ingest(rawText, expectedType);
        setScanError(null);
        setFrameProgress({
          received: res.receivedCount,
          total: res.totalCount,
        });

        if (res.complete && res.payload) {
          completedRef.current = true;
          void stopScanner();
          onCompleteRef.current(res.payload);
          return true;
        }
        return false;
      } catch (err) {
        setScanError(
          err instanceof Error ? err.message : "Invalid QR or connection code."
        );
        return false;
      }
    },
    [expectedType, stopScanner]
  );

  const startScanner = useCallback(
    async (elementId: string, preferredCameraId?: string) => {
      setScanError(null);
      completedRef.current = false;
      assemblerRef.current.reset();
      setFrameProgress({ received: 0, total: 0 });
      activeElementIdRef.current = elementId;

      if (
        typeof window === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setPermissionState("unsupported");
        setScanError(
          "Camera access is unavailable in this browser context. Browsers require HTTPS or localhost for camera access — please use 'Connect using Code' or upload a QR image."
        );
        return;
      }

      await stopScanner();
      activeElementIdRef.current = elementId;

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const html5QrCode = new Html5Qrcode(elementId);
        scannerInstanceRef.current = html5QrCode;
        setIsScanning(true);

        const scanConfig = {
          fps: 15,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        };

        const onFrameDecoded = (decodedText: string) => {
          handleDecodedString(decodedText);
        };

        const onFrameError = () => {
          // Normal while aiming camera
        };

        const explicitCamId = preferredCameraId || selectedCameraId;
        let started = false;

        // 1. If user has not explicitly picked a camera ID, prefer facingMode: "environment"
        // which works reliably on iOS Safari & Android Chrome before device labels are unlocked.
        if (!explicitCamId) {
          try {
            await html5QrCode.start(
              { facingMode: "environment" },
              scanConfig,
              onFrameDecoded,
              onFrameError
            );
            started = true;
            setPermissionState("granted");
          } catch {
            // Fall back to enumerated camera list (e.g., desktop webcam without environment facing mode)
          }
        }

        // 2. Enumerate cameras to populate switcher and/or start by device ID
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const mapped = devices.map((d, i) => ({
              id: d.id,
              label: d.label || `Camera ${i + 1}`,
            }));
            setCameras(mapped);

            let targetCamId = explicitCamId;
            if (!targetCamId) {
              const backCam = mapped.find((c) =>
                /back|rear|environment/i.test(c.label)
              );
              targetCamId = backCam ? backCam.id : mapped[0].id;
              setSelectedCameraId(targetCamId);
            }

            if (!started) {
              await html5QrCode.start(
                targetCamId,
                scanConfig,
                onFrameDecoded,
                onFrameError
              );
              started = true;
              setPermissionState("granted");
            }
          } else if (!started) {
            throw new Error("No camera devices detected on this device.");
          }
        } catch (enumErr) {
          if (!started) {
            throw enumErr;
          }
        }
      } catch (err) {
        await stopScanner();
        const msg = err instanceof Error ? err.message : String(err);
        if (/permission|notallowed|denied/i.test(msg)) {
          setPermissionState("denied");
          setScanError(
            "Camera permission was denied. Allow camera access in your browser settings, or switch to 'Connect using Code'."
          );
        } else {
          setScanError(
            `Could not start camera: ${msg}. You can switch to 'Connect using Code' instead.`
          );
        }
      }
    },
    [handleDecodedString, selectedCameraId, stopScanner]
  );

  const scanFromImageFile = useCallback(
    async (file: File) => {
      setScanError(null);
      try {
        const decoded = await decodeQRFromImageFile(file);
        handleDecodedString(decoded);
      } catch (err) {
        setScanError(
          err instanceof Error
            ? err.message
            : "Could not read a valid LetsShare QR code from that image."
        );
      }
    },
    [handleDecodedString]
  );

  const submitManualCode = useCallback(
    (code: string): { ok: boolean; error?: string } => {
      setScanError(null);
      const validation = validateConnectionCode(code, expectedType);
      if (!validation.valid || !validation.payload) {
        const errMsg =
          validation.error || "Invalid connection code. Please check and try again.";
        setScanError(errMsg);
        return { ok: false, error: errMsg };
      }

      completedRef.current = true;
      assemblerRef.current.reset();
      void stopScanner();
      onCompleteRef.current(validation.payload);
      return { ok: true };
    },
    [expectedType, stopScanner]
  );

  const resetProgress = useCallback(() => {
    completedRef.current = false;
    assemblerRef.current.reset();
    setFrameProgress({ received: 0, total: 0 });
    setScanError(null);
  }, []);

  return {
    isScanning,
    permissionState,
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
    resetProgress,
  };
}
