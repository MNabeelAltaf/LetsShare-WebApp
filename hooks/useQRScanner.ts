"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CompactSDP } from "@/lib/types";
import { QRFrameAssembler } from "@/lib/signaling/sdp-compact";
import { decodeQRFromImageFile } from "@/lib/qr/qr-service";

export interface CameraDevice {
  id: string;
  label: string;
}

export interface UseQRScannerOptions {
  expectedType?: "O" | "A";
  onComplete: (payload: CompactSDP) => void;
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
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const stopScanner = useCallback(async () => {
    const instance = scannerInstanceRef.current;
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
  }, []);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const handleDecodedString = useCallback(
    (rawText: string) => {
      if (completedRef.current) return;
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
        }
      } catch (err) {
        setScanError(
          err instanceof Error ? err.message : "Invalid QR code scanned."
        );
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

      if (
        typeof window === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setPermissionState("unsupported");
        setScanError(
          "Camera access is unavailable in this browser or context. Note that browsers require HTTPS or localhost for camera access. You can upload a QR screenshot or paste the pairing code below."
        );
        return;
      }

      await stopScanner();

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setPermissionState("denied");
          setScanError("No camera devices detected on this system.");
          return;
        }

        setPermissionState("granted");
        const mapped = devices.map((d, i) => ({
          id: d.id,
          label: d.label || `Camera ${i + 1}`,
        }));
        setCameras(mapped);

        // Prefer back/environment camera on mobile if no specific camera selected
        let targetCamId = preferredCameraId || selectedCameraId;
        if (!targetCamId) {
          const backCam = mapped.find((c) =>
            /back|rear|environment/i.test(c.label)
          );
          targetCamId = backCam ? backCam.id : mapped[0].id;
          setSelectedCameraId(targetCamId);
        }

        const html5QrCode = new Html5Qrcode(elementId);
        scannerInstanceRef.current = html5QrCode;
        setIsScanning(true);

        await html5QrCode.start(
          targetCamId,
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleDecodedString(decodedText);
          },
          () => {
            // Frame scan miss — normal while aiming camera
          }
        );
      } catch (err) {
        setIsScanning(false);
        const msg = err instanceof Error ? err.message : String(err);
        if (/permission|notallowed|denied/i.test(msg)) {
          setPermissionState("denied");
          setScanError(
            "Camera permission was denied. Please allow camera access in your browser address bar, or use the QR Image Upload / Pairing Code option below."
          );
        } else {
          setScanError(`Could not start camera scanner: ${msg}`);
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
            : "Could not read a valid Droply QR code from that image."
        );
      }
    },
    [handleDecodedString]
  );

  const submitManualCode = useCallback(
    (code: string) => {
      setScanError(null);
      if (!code.trim()) {
        setScanError("Please paste a valid Droply pairing code.");
        return;
      }
      completedRef.current = false;
      assemblerRef.current.reset();
      handleDecodedString(code.trim());
    },
    [handleDecodedString]
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
    frameProgress,
    startScanner,
    stopScanner,
    scanFromImageFile,
    submitManualCode,
    resetProgress,
  };
}

