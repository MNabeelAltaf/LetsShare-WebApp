"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  RotateCcw,
  Download,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Zap,
  HardDriveDownload,
  Loader2,
} from "lucide-react";
import {
  FileTransferProgress,
  PeerRole,
  TransferManifest,
} from "@/lib/types";
import { formatBytes, formatDuration } from "@/lib/file/format";
import { FileCategoryIcon } from "@/components/files/file-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface TransferPanelProps {
  role: PeerRole;
  peerDeviceName: string;
  incomingManifest: TransferManifest | null;
  manifestDecision: "pending" | "accepted" | "rejected";
  progressList: FileTransferProgress[];
  sessionCompleted: boolean;
  onAcceptManifest: () => void;
  onRejectManifest: () => void;
  onControlFile: (
    fileId: string,
    action: "pause" | "resume" | "cancel" | "retry"
  ) => void;
  onStartNewSession: () => void;
}

export function TransferPanel({
  role,
  peerDeviceName,
  incomingManifest,
  manifestDecision,
  progressList,
  sessionCompleted,
  onAcceptManifest,
  onRejectManifest,
  onControlFile,
  onStartNewSession,
}: TransferPanelProps) {
  const totalBytes = progressList.reduce((acc, f) => acc + f.fileSize, 0);
  const transferredBytes = progressList.reduce(
    (acc, f) => acc + f.bytesTransferred,
    0
  );
  const overallPercentage =
    totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100)) : 0;

  const activeSpeedMBps = progressList.reduce(
    (acc, f) => (f.status === "transferring" ? acc + f.speedMBps : acc),
    0
  );

  const completedFiles = progressList.filter((f) => f.status === "completed");
  const allVerified =
    completedFiles.length > 0 && completedFiles.every((f) => f.verified);

  return (
    <div className="space-y-5">
      {/* Explicit Receiver Acceptance Prompt (Security Requirement Section 8) */}
      {role === "receiver" &&
        incomingManifest &&
        manifestDecision === "pending" && (
          <div className="rounded-2xl border-2 border-teal-500/50 bg-teal-500/5 p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Incoming File Transfer Request</Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    Session #{incomingManifest.sessionId}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {incomingManifest.senderName || peerDeviceName} wants to send{" "}
                  {incomingManifest.files.length}{" "}
                  {incomingManifest.files.length === 1 ? "file" : "files"} (
                  {formatBytes(incomingManifest.totalSize)})
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review the incoming file metadata below before accepting. Files
                  are transferred directly over encrypted WebRTC DataChannel and
                  verified with SHA-256.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onRejectManifest}
                >
                  <XCircle className="size-4" />
                  Decline
                </Button>
                <Button
                  type="button"
                  onClick={onAcceptManifest}
                  className="bg-teal-600 text-white hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
                >
                  <CheckCircle2 className="size-4" />
                  Accept & Receive Files
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* Sender waiting for Receiver acceptance banner */}
      {role === "sender" &&
        progressList.length > 0 &&
        progressList.every((p) => p.status === "awaiting-acceptance") && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
            <Loader2 className="size-5 shrink-0 animate-spin" />
            <div>
              <p className="font-semibold">
                Waiting for {peerDeviceName} to accept the incoming transfer...
              </p>
              <p className="text-xs opacity-90">
                File manifest and SHA-256 hashes have been sent. Transfer begins
                as soon as the receiver clicks Accept.
              </p>
            </div>
          </div>
        )}

      {/* Overall Transfer Summary Header */}
      {progressList.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {sessionCompleted
                    ? "Transfer Session Completed"
                    : role === "sender"
                    ? `Sending to ${peerDeviceName}`
                    : `Receiving from ${peerDeviceName}`}
                </h3>
                {sessionCompleted && allVerified && (
                  <Badge variant="success">
                    <ShieldCheck className="size-3.5" />
                    SHA-256 Verified
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatBytes(transferredBytes)} of {formatBytes(totalBytes)} (
                {overallPercentage}%) • {completedFiles.length} of{" "}
                {progressList.length} files completed
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeSpeedMBps > 0 && (
                <Badge variant="outline" className="gap-1 font-mono text-xs">
                  <Zap className="size-3.5 text-teal-500" />
                  {activeSpeedMBps.toFixed(2)} MB/s
                </Badge>
              )}
              {sessionCompleted && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onStartNewSession}
                >
                  Share More Files
                </Button>
              )}
            </div>
          </div>

          <Progress value={overallPercentage} className="mt-4 h-2.5" />
        </div>
      )}

      {/* Individual File Progress Cards */}
      <div className="space-y-3">
        {progressList.map((item) => {
          const isTransferring = item.status === "transferring";
          const isPaused = item.status === "paused";
          const isCompleted = item.status === "completed";
          const isFailed =
            item.status === "error" || item.status === "verification-failed";

          return (
            <div
              key={item.fileId}
              className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs transition-all"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <FileCategoryIcon
                    mimeType={item.fileType}
                    fileName={item.fileName}
                    className="size-6"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="truncate text-sm font-semibold text-foreground"
                        title={item.fileName}
                      >
                        {item.fileName}
                      </p>
                      <Badge
                        variant={
                          isCompleted
                            ? "success"
                            : isFailed
                            ? "destructive"
                            : isPaused
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {item.status.replace("-", " ")}
                      </Badge>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {formatBytes(item.bytesTransferred)} /{" "}
                        {formatBytes(item.fileSize)} ({item.percentage}%)
                      </span>
                      <span>•</span>
                      <span>
                        Chunks: {item.chunksTransferred}/{item.totalChunks}
                      </span>
                      {isTransferring && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-teal-600 dark:text-teal-400">
                            {item.speedMBps.toFixed(2)} MB/s
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            ETA: {formatDuration(item.estimatedSecondsRemaining)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Action Buttons */}
                <div className="flex shrink-0 items-center gap-2">
                  {isTransferring && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => onControlFile(item.fileId, "pause")}
                    >
                      <Pause className="size-3" />
                      Pause
                    </Button>
                  )}

                  {isPaused && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => onControlFile(item.fileId, "resume")}
                    >
                      <Play className="size-3" />
                      Resume
                    </Button>
                  )}

                  {(isTransferring || isPaused || item.status === "queued") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => onControlFile(item.fileId, "cancel")}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <XCircle className="size-3.5" />
                      Cancel
                    </Button>
                  )}

                  {(isFailed || item.status === "cancelled") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => onControlFile(item.fileId, "retry")}
                    >
                      <RotateCcw className="size-3" />
                      Retry
                    </Button>
                  )}

                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      download={item.fileName}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
                    >
                      <Download className="size-3.5" />
                      Save File
                    </a>
                  )}
                </div>
              </div>

              <Progress
                value={item.percentage}
                className="mt-3 h-2"
                indicatorClassName={
                  isCompleted
                    ? "bg-emerald-500"
                    : isFailed
                    ? "bg-red-500"
                    : undefined
                }
              />

              {/* SHA-256 Checksum Integrity Footer */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono truncate max-w-full">
                  SHA-256: {item.sha256Actual || item.sha256Expected}
                </span>
                {item.verified === true && (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3.5" />
                    Integrity Verified (Checksums Match)
                  </span>
                )}
                {item.verified === false && (
                  <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                    <ShieldAlert className="size-3.5" />
                    Checksum Mismatch!
                  </span>
                )}
              </div>

              {item.error && (
                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {item.error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Download All helper for Receiver when multiple files complete */}
      {role === "receiver" && completedFiles.length > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <HardDriveDownload className="size-5 text-emerald-500" />
            <span>
              All {completedFiles.length} files have been reconstructed in browser
              memory and verified via SHA-256.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              completedFiles.forEach((f, idx) => {
                if (!f.downloadUrl) return;
                setTimeout(() => {
                  const a = document.createElement("a");
                  a.href = f.downloadUrl!;
                  a.download = f.fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }, idx * 250);
              });
            }}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <Download className="size-3.5" />
            Download All ({completedFiles.length})
          </Button>
        </div>
      )}
    </div>
  );
}

