"use client";

import React, { useEffect, useState } from "react";
import {
  Copy,
  Check,
  Layers,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Download,
} from "lucide-react";
import { QRFrame } from "@/lib/types";
import { generateQRDataUrl } from "@/lib/qr/qr-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QRDisplayProps {
  frames: QRFrame[];
  compactCode: string;
  title: string;
  subtitle: string;
  forceMultiFrame: boolean;
  onToggleMultiFrame: (next: boolean) => void;
}

export function QRDisplay({
  frames,
  compactCode,
  title,
  subtitle,
  forceMultiFrame,
  onToggleMultiFrame,
}: QRDisplayProps) {
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalMs, setIntervalMs] = useState(550);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderFrames() {
      const urls: string[] = [];
      for (const frame of frames) {
        const url = await generateQRDataUrl(frame.raw, {
          width: 380,
          margin: 2,
        });
        urls.push(url);
      }
      if (!cancelled) {
        setActiveIndex(0);
        setDataUrls(urls);
      }
    }

    if (frames.length > 0) {
      void renderFrames();
    }

    return () => {
      cancelled = true;
    };
  }, [frames]);

  useEffect(() => {
    if (frames.length <= 1 || !isPlaying) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [frames.length, isPlaying, intervalMs]);

  const handleCopyCode = async () => {
    if (!compactCode) return;
    try {
      await navigator.clipboard.writeText(compactCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  if (frames.length === 0) return null;

  const currentFrame = frames[activeIndex] || frames[0];
  const currentUrl = dataUrls[activeIndex] || dataUrls[0];
  const isMulti = frames.length > 1;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-mono">
            {isMulti
              ? `Frame ${activeIndex + 1} / ${frames.length}`
              : "Single QR"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onToggleMultiFrame(!forceMultiFrame)}
            title="Switch between a single high-density QR code and lower-density animated multi-QR frames for easier camera scanning"
          >
            {forceMultiFrame ? (
              <>
                <Maximize2 className="size-3" />
                Single QR Mode
              </>
            ) : (
              <>
                <Layers className="size-3" />
                Easy Scan (Multi-QR)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* High-contrast white QR frame container so scanners read reliably even in Dark Mode */}
      <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-4 border-white bg-white p-3 shadow-md">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={`Droply WebRTC Pairing QR Frame ${activeIndex + 1} of ${frames.length}`}
            className="size-64 sm:size-72 object-contain select-none"
          />
        ) : (
          <div className="flex size-64 sm:size-72 items-center justify-center text-xs text-zinc-500">
            Generating QR Code...
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono font-medium text-zinc-700">
          <span>Session: {currentFrame.sessionId}</span>
          <span>•</span>
          <span>Checksum: {currentFrame.checksum}</span>
          {isMulti && (
            <>
              <span>•</span>
              <span>
                Part {activeIndex + 1}/{frames.length}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Multi-frame controls when payload spans multiple QR frames */}
      {isMulti && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() =>
              setActiveIndex((prev) => (prev - 1 + frames.length) % frames.length)
            }
            aria-label="Previous QR frame"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <>
                <Pause className="size-3" /> Pause Cycle
              </>
            ) : (
              <>
                <Play className="size-3" /> Auto-Cycle
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => setActiveIndex((prev) => (prev + 1) % frames.length)}
            aria-label="Next QR frame"
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <select
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            aria-label="QR cycle speed"
            className="h-6 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          >
            <option value={350}>Fast (350ms)</option>
            <option value={550}>Normal (550ms)</option>
            <option value={900}>Slow (900ms)</option>
          </select>
        </div>
      )}

      {/* Offline fallback tools: Save QR image or Copy compact string (great for desktop-to-desktop testing or broken cameras) */}
      <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="text-[11px] text-muted-foreground">
          Point the other device&apos;s camera at this QR code
        </span>
        <div className="flex items-center gap-2">
          {currentUrl && (
            <a
              href={currentUrl}
              download={`droply-${currentFrame.type === "O" ? "offer" : "answer"}-${currentFrame.sessionId}.png`}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Download className="size-3" />
              Save QR PNG
            </a>
          )}
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => void handleCopyCode()}
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                Copied Code
              </>
            ) : (
              <>
                <Copy className="size-3" />
                Copy Pairing Code
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

