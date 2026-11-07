"use client";

import React from "react";
import {
  Check,
  X,
  Pause,
  Play,
  RotateCcw,
  Download,
  Loader2,
} from "lucide-react";
import {
  FileTransferProgress,
  PeerRole,
  TransferManifest,
} from "@/lib/types";
import { formatBytes } from "@/lib/file/format";
import { FileCategoryIcon } from "@/components/files/file-picker";
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
    totalBytes > 0
      ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100))
      : 0;

  const completedFiles = progressList.filter((f) => f.status === "completed");

  return (
    <div className="space-y-4">
      {/* Receiver Accept Prompt */}
      {role === "receiver" &&
        incomingManifest &&
        manifestDecision === "pending" && (
          <div className="rounded-2xl border-2 border-foreground bg-card p-5 text-center">
            <h3 className="text-base font-bold text-foreground">
              Accept {incomingManifest.files.length}{" "}
              {incomingManifest.files.length === 1 ? "file" : "files"} (
              {formatBytes(incomingManifest.totalSize)})?
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              From {incomingManifest.senderName || peerDeviceName}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onRejectManifest}
                className="h-10 rounded-xl border border-border bg-secondary text-xs font-bold text-foreground"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={onAcceptManifest}
                className="h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
              >
                Accept Files
              </button>
            </div>
          </div>
        )}

      {/* Sender waiting for Receiver acceptance */}
      {role === "sender" &&
        progressList.length > 0 &&
        progressList.every((p) => p.status === "awaiting-acceptance") && (
          <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-5 text-xs font-bold text-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Waiting for receiver to tap Accept...</span>
          </div>
        )}

      {/* Overall Summary Card */}
      {progressList.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {sessionCompleted
                  ? "Transfer Complete"
                  : role === "sender"
                  ? "Sending..."
                  : "Receiving..."}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatBytes(transferredBytes)} / {formatBytes(totalBytes)} (
                {overallPercentage}%)
              </p>
            </div>

            {sessionCompleted && (
              <button
                type="button"
                onClick={onStartNewSession}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-bold text-background"
              >
                Done
              </button>
            )}
          </div>

          <Progress value={overallPercentage} className="mt-3" />
        </div>
      )}

      {/* File List */}
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {progressList.map((item) => {
          const isTransferring = item.status === "transferring";
          const isPaused = item.status === "paused";
          const isCompleted = item.status === "completed";
          const isFailed =
            item.status === "error" || item.status === "verification-failed";

          return (
            <div key={item.fileId} className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <FileCategoryIcon
                    mimeType={item.fileType}
                    fileName={item.fileName}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs font-bold text-foreground"
                      title={item.fileName}
                    >
                      {item.fileName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(item.fileSize)}
                      {isTransferring && ` • ${item.speedMBps.toFixed(1)} MB/s`}
                      {isCompleted && " • Complete"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {isTransferring && (
                    <button
                      type="button"
                      onClick={() => onControlFile(item.fileId, "pause")}
                      className="rounded-md border border-border p-1.5 text-foreground"
                      aria-label="Pause"
                    >
                      <Pause className="size-3.5" />
                    </button>
                  )}

                  {isPaused && (
                    <button
                      type="button"
                      onClick={() => onControlFile(item.fileId, "resume")}
                      className="rounded-md border border-border p-1.5 text-foreground"
                      aria-label="Resume"
                    >
                      <Play className="size-3.5" />
                    </button>
                  )}

                  {(isTransferring || isPaused) && (
                    <button
                      type="button"
                      onClick={() => onControlFile(item.fileId, "cancel")}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                      aria-label="Cancel"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}

                  {isFailed && (
                    <button
                      type="button"
                      onClick={() => onControlFile(item.fileId, "retry")}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold"
                    >
                      <RotateCcw className="size-3" />
                      Retry
                    </button>
                  )}

                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      download={item.fileName}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
                    >
                      <Download className="size-3.5" />
                      Save
                    </a>
                  )}

                  {isCompleted && !item.downloadUrl && (
                    <Check className="size-4 text-emerald-600" />
                  )}
                </div>
              </div>

              {!isCompleted && (
                <Progress value={item.percentage} className="mt-2.5 h-1.5" />
              )}

              {item.error && (
                <p className="mt-1.5 text-xs text-destructive">{item.error}</p>
              )}
            </div>
          );
        })}
      </div>

      {role === "receiver" && completedFiles.length > 1 && (
        <button
          type="button"
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
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
        >
          <Download className="size-4" />
          Save All ({completedFiles.length} Files)
        </button>
      )}
    </div>
  );
}
