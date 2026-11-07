"use client";

import React, { useEffect, useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { QRFrame } from "@/lib/types";
import { generateQRDataUrl } from "@/lib/qr/qr-service";

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderFrames() {
      const urls: string[] = [];
      for (const frame of frames) {
        const url = await generateQRDataUrl(frame.raw, {
          width: 340,
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
    if (frames.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % frames.length);
    }, 550);
    return () => clearInterval(timer);
  }, [frames.length]);

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
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

      <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-3">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt="LetsShare QR Code"
            className="size-56 sm:size-64 object-contain select-none"
          />
        ) : (
          <div className="flex size-56 sm:size-64 items-center justify-center text-xs text-neutral-500">
            Creating QR...
          </div>
        )}
        {isMulti && (
          <span className="mt-1.5 font-mono text-[11px] font-bold text-neutral-700">
            Frame {activeIndex + 1}/{frames.length}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => void handleCopyCode()}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy Code
            </>
          )}
        </button>

        {currentUrl && (
          <a
            href={currentUrl}
            download={`letsshare-qr-${currentFrame.sessionId}.png`}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            <Download className="size-3.5" />
            Save QR
          </a>
        )}

        <button
          type="button"
          onClick={() => onToggleMultiFrame(!forceMultiFrame)}
          className="inline-flex h-7 items-center rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {forceMultiFrame ? "Single QR" : "Easier Scan"}
        </button>
      </div>
    </div>
  );
}
