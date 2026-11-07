"use client";

import React from "react";
import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { TransferPanel } from "@/components/transfer/transfer-panel";
import { formatBytes } from "@/lib/file/format";

export default function TransferCompletionPage() {
  const {
    role,
    peerDeviceName,
    incomingManifest,
    manifestDecision,
    progressList,
    sessionCompleted,
    recentSessions,
    acceptIncomingTransfer,
    rejectIncomingTransfer,
    controlFile,
    terminateEntireSession,
    clearHistory,
  } = useDroplySession();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          Transfers
        </h1>
        {recentSessions.length > 0 && (
          <button
            type="button"
            onClick={() => void clearHistory()}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Clear
          </button>
        )}
      </div>

      {progressList.length > 0 && (
        <TransferPanel
          role={role}
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
      )}

      {recentSessions.length === 0 && progressList.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-bold text-foreground">No transfers yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Files you send or receive will appear here.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Link
              href="/send"
              className="flex h-10 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground"
            >
              Send Files
            </Link>
            <Link
              href="/receive"
              className="flex h-10 items-center justify-center rounded-xl border border-border bg-secondary text-xs font-bold text-foreground"
            >
              Receive Files
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {recentSessions.map((s) => (
            <div
              key={s.sessionId}
              className="flex items-center justify-between p-4 text-xs"
            >
              <div>
                <p className="font-bold text-foreground">
                  {s.role === "sender" ? "Sent" : "Received"} {s.filesCount}{" "}
                  {s.filesCount === 1 ? "file" : "files"} (
                  {formatBytes(s.totalSize)})
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {s.files.map((f) => f.name).join(", ")}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <Check className="size-3.5" />
                Done
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
