"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  FileTransferProgress,
  PeerRole,
  SelectedFileItem,
  TransferManifest,
  TransferSessionSummary,
} from "@/lib/types";
import { FileTransferEngine } from "@/lib/transfer/transfer-engine";
import { sanitizeFileName } from "@/lib/security/crypto";
import { getLocalDeviceLabel } from "@/lib/webrtc/peer-manager";
import {
  clearSessionHistory,
  loadSessionSummaries,
  saveSessionSummary,
} from "@/lib/offline/indexed-db";

export function useFileTransfer() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [incomingManifest, setIncomingManifest] =
    useState<TransferManifest | null>(null);
  const [manifestDecision, setManifestDecision] = useState<
    "pending" | "accepted" | "rejected"
  >("pending");
  const [progressList, setProgressList] = useState<FileTransferProgress[]>([]);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [recentSessions, setRecentSessions] = useState<TransferSessionSummary[]>([]);

  const engineRef = useRef<FileTransferEngine | null>(null);
  const sessionMetaRef = useRef<{
    sessionId: string;
    role: PeerRole;
    peerName: string;
    startedAt: number;
  }>({
    sessionId: "",
    role: "idle",
    peerName: "Remote Peer",
    startedAt: 0,
  });

  useEffect(() => {
    void loadSessionSummaries().then(setRecentSessions);
    return () => {
      engineRef.current?.cleanup();
    };
  }, []);

  const ensureEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new FileTransferEngine({
        onManifestReceived: (manifest) => {
          setIncomingManifest(manifest);
          setManifestDecision("pending");
          setSessionCompleted(false);
        },
        onManifestAccepted: () => {
          setManifestDecision("accepted");
        },
        onManifestRejected: (reason) => {
          setManifestDecision("rejected");
          setTransferError(reason);
        },
        onProgressUpdate: (list) => {
          setProgressList([...list]);
        },
        onSessionCompleted: (list) => {
          setProgressList([...list]);
          setSessionCompleted(true);

          const meta = sessionMetaRef.current;
          if (meta.sessionId && (meta.role === "sender" || meta.role === "receiver")) {
            const totalSize = list.reduce((acc, f) => acc + f.fileSize, 0);
            const durationSeconds = Math.max(
              0.5,
              Number(((Date.now() - meta.startedAt) / 1000).toFixed(1))
            );
            const averageSpeedMBps = Number(
              (totalSize / (1024 * 1024) / durationSeconds).toFixed(2)
            );
            const allVerified = list.every((f) => f.verified === true);

            const summary: TransferSessionSummary = {
              sessionId: meta.sessionId,
              role: meta.role,
              peerName: meta.peerName,
              filesCount: list.length,
              totalSize,
              durationSeconds,
              averageSpeedMBps,
              allVerified,
              completedAt: Date.now(),
              files: list.map((f) => ({
                id: f.fileId,
                name: f.fileName,
                size: f.fileSize,
                type: f.fileType,
                verified: Boolean(f.verified),
                sha256: f.sha256Actual || f.sha256Expected,
                downloadUrl: f.downloadUrl,
              })),
            };

            setRecentSessions((prev) => {
              const filtered = prev.filter((s) => s.sessionId !== summary.sessionId);
              return [summary, ...filtered].slice(0, 10);
            });
            void saveSessionSummary(summary);
          }
        },
        onError: (err) => {
          setTransferError(err);
        },
      });
    }
    return engineRef.current;
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files);
    setSelectedFiles((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        const cleanName = sanitizeFileName(file.name);
        const duplicate = next.some(
          (item) =>
            item.name === cleanName &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );
        if (!duplicate) {
          next.push({
            id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            name: cleanName,
            size: file.size,
            type: file.type || "application/octet-stream",
            lastModified: file.lastModified,
          });
        }
      }
      return next;
    });
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const bindDataChannelAndStart = useCallback(
    async (
      channel: RTCDataChannel,
      meta: {
        sessionId: string;
        sessionToken: string;
        role: PeerRole;
        peerName: string;
      },
      filesToSend: SelectedFileItem[]
    ) => {
      setTransferError(null);
      setSessionCompleted(false);
      sessionMetaRef.current = {
        sessionId: meta.sessionId,
        role: meta.role,
        peerName: meta.peerName,
        startedAt: Date.now(),
      };

      const engine = ensureEngine();
      engine.attachChannel(channel);

      if (meta.role === "sender" && filesToSend.length > 0) {
        await engine.prepareAndSendManifest({
          sessionId: meta.sessionId,
          sessionToken: meta.sessionToken,
          senderName: getLocalDeviceLabel(),
          files: filesToSend,
        });
      }
    },
    [ensureEngine]
  );

  const acceptIncomingTransfer = useCallback(() => {
    setManifestDecision("accepted");
    sessionMetaRef.current.startedAt = Date.now();
    ensureEngine().acceptIncomingManifest();
  }, [ensureEngine]);

  const rejectIncomingTransfer = useCallback(() => {
    setManifestDecision("rejected");
    ensureEngine().rejectIncomingManifest("Transfer declined by receiver.");
  }, [ensureEngine]);

  const controlFile = useCallback(
    (fileId: string, action: "pause" | "resume" | "cancel" | "retry") => {
      ensureEngine().controlFileTransfer(fileId, action);
    },
    [ensureEngine]
  );

  const resetTransferState = useCallback(() => {
    engineRef.current?.cleanup();
    engineRef.current = null;
    setIncomingManifest(null);
    setManifestDecision("pending");
    setProgressList([]);
    setTransferError(null);
    setSessionCompleted(false);
  }, []);

  const clearHistory = useCallback(async () => {
    await clearSessionHistory();
    setRecentSessions([]);
  }, []);

  const totalSelectedBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  return {
    selectedFiles,
    totalSelectedBytes,
    addFiles,
    removeFile,
    clearSelectedFiles,
    incomingManifest,
    manifestDecision,
    progressList,
    transferError,
    setTransferError,
    sessionCompleted,
    recentSessions,
    bindDataChannelAndStart,
    acceptIncomingTransfer,
    rejectIncomingTransfer,
    controlFile,
    resetTransferState,
    clearHistory,
  };
}

