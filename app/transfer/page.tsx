"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  Zap,
  Send,
  Download,
  HardDrive,
  FileCheck2,
  Trash2,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { NetworkStatusBar } from "@/components/network/network-status-bar";
import { TransferPanel } from "@/components/transfer/transfer-panel";
import { formatBytes, formatDuration } from "@/lib/file/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

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

  const latestSession = recentSessions[0] || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default">Transfer Telemetry &amp; Verification</Badge>
            <span className="text-xs text-muted-foreground">
              SHA-256 End-to-End Integrity
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Transfers &amp; Verification Report
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/send"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-4 text-xs font-semibold text-white hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
          >
            <Send className="size-3.5" />
            Share More Files
          </Link>
          <Link
            href="/receive"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Download className="size-3.5 text-teal-500" />
            Receive Files
          </Link>
        </div>
      </div>

      <NetworkStatusBar compact />

      {/* Live / Active Session Transfer Panel */}
      {progressList.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Current Session Queue
          </h2>
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
        </section>
      )}

      {/* Highlighted Completion Card for Latest Session */}
      {latestSession && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <CardTitle className="text-lg">
                  {latestSession.role === "sender"
                    ? "Files Sent Successfully"
                    : "Files Received & Reconstructed"}
                </CardTitle>
              </div>
              {latestSession.allVerified && (
                <Badge variant="success">
                  <ShieldCheck className="size-3.5" />
                  All SHA-256 Checksums Verified
                </Badge>
              )}
            </div>
            <CardDescription>
              Direct peer-to-peer transfer with{" "}
              <strong>{latestSession.peerName}</strong> (Session #
              {latestSession.sessionId})
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                <span className="text-[11px] text-muted-foreground">
                  Files Transferred
                </span>
                <p className="mt-0.5 text-base font-bold text-foreground">
                  {latestSession.filesCount}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                <span className="text-[11px] text-muted-foreground">
                  Total Size
                </span>
                <p className="mt-0.5 text-base font-bold text-foreground">
                  {formatBytes(latestSession.totalSize)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                <span className="text-[11px] text-muted-foreground">
                  Transfer Duration
                </span>
                <p className="mt-0.5 text-base font-bold text-foreground">
                  {formatDuration(latestSession.durationSeconds)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                <span className="text-[11px] text-muted-foreground">
                  Average Throughput
                </span>
                <p className="mt-0.5 text-base font-bold text-teal-600 dark:text-teal-400">
                  {latestSession.averageSpeedMBps} MB/s
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verified Files in Session #{latestSession.sessionId}
              </h4>
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-background/90">
                {latestSession.files.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="size-4 shrink-0 text-emerald-500" />
                        <span className="font-semibold text-foreground truncate">
                          {f.name}
                        </span>
                        <span className="text-muted-foreground">
                          ({formatBytes(f.size)})
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">
                        SHA-256: {f.sha256}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {f.verified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="destructive">Mismatch</Badge>
                      )}
                      {f.downloadUrl && (
                        <a
                          href={f.downloadUrl}
                          download={f.name}
                          className="inline-flex h-7 items-center gap-1 rounded-lg bg-teal-600 px-2.5 text-xs font-semibold text-white hover:bg-teal-500"
                        >
                          <Download className="size-3" />
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session History List */}
      <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Completed Sessions Log
            </h2>
            <p className="text-xs text-muted-foreground">
              Stored locally in your browser&apos;s IndexedDB. Never uploaded.
            </p>
          </div>
          {recentSessions.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void clearHistory()}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Clear All
            </Button>
          )}
        </div>

        {recentSessions.length === 0 && progressList.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
            <HardDrive className="size-9 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              No active or completed transfers yet
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Start a session from Send or Receive to transfer files directly
              between devices using QR codes and WebRTC.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recentSessions.map((s) => (
              <div
                key={s.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={s.role === "sender" ? "default" : "secondary"}
                    >
                      {s.role.toUpperCase()}
                    </Badge>
                    <span className="font-semibold text-foreground">
                      {s.filesCount} {s.filesCount === 1 ? "file" : "files"} •{" "}
                      {formatBytes(s.totalSize)}
                    </span>
                    <span className="text-muted-foreground">
                      ({s.peerName})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />{" "}
                      {formatDuration(s.durationSeconds)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Zap className="size-3 text-teal-500" />{" "}
                      {s.averageSpeedMBps} MB/s
                    </span>
                    <span className="font-mono">#{s.sessionId}</span>
                  </div>
                </div>
                {s.allVerified && (
                  <Badge variant="success">
                    <ShieldCheck className="size-3" />
                    SHA-256 Verified
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

