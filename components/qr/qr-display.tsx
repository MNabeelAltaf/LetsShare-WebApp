"use client";

import React, { useEffect, useState } from "react";
import { Copy, Check, Download, QrCode, KeyRound } from "lucide-react";
import { QRFrame } from "@/lib/types";
import { generateQRDataUrl } from "@/lib/qr/qr-service";
import { cn } from "@/lib/utils";

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
  const [displayMode, setDisplayMode] = useState<"qr" | "code">("qr");

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
    if (frames.length <= 1 || displayMode !== "qr") return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % frames.length);
    }, 550);
    return () => clearInterval(timer);
  }, [frames.length, displayMode]);

  const handleCopyCode = async () => {
    if (!compactCode) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(compactCode);
      } else {
        const temp = document.createElement("textarea");
        temp.value = compactCode;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard error
    }
  };

  if (frames.length === 0) return null;

  const currentFrame = frames[activeIndex] || frames[0];
  const currentUrl = dataUrls[activeIndex] || dataUrls[0];
  const isMulti = frames.length > 1;

  return (
    <div
      data-no-swipe="true"
      className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center"
    >
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>

      {/* Mode Switcher: QR Code vs Connect using Code */}
      <div className="mt-3.5 grid w-full max-w-xs grid-cols-2 rounded-xl border border-border bg-background p-1">
        <button
          type="button"
          onClick={() => setDisplayMode("qr")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-colors touch-manipulation",
            displayMode === "qr"
              ? "bg-card text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <QrCode className="size-3.5" />
          QR Code
        </button>
        <button
          type="button"
          onClick={() => setDisplayMode("code")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-colors touch-manipulation",
            displayMode === "code"
              ? "bg-card text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <KeyRound className="size-3.5" />
          Connect using Code
        </button>
      </div>

      {displayMode === "qr" ? (
        <>
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
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-secondary touch-manipulation"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  Copied!
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-secondary touch-manipulation"
              >
                <Download className="size-3.5" />
                Save QR
              </a>
            )}

            <button
              type="button"
              onClick={() => onToggleMultiFrame(!forceMultiFrame)}
              className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground touch-manipulation"
            >
              {forceMultiFrame ? "Single QR" : "Easier Scan"}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 flex w-full flex-col items-stretch gap-3 text-left">
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs">
            <span className="text-muted-foreground">Session ID</span>
            <span className="font-mono font-bold text-foreground">
              #{currentFrame.sessionId} ({currentFrame.type === "O" ? "Offer" : "Answer"})
            </span>
          </div>

          <div className="relative">
            <textarea
              readOnly
              value={compactCode}
              onClick={(e) => e.currentTarget.select()}
              aria-label="Connection code"
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground break-all outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleCopyCode()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:opacity-95 touch-manipulation"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Connection Code Copied!
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy Connection Code
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-muted-foreground">
            Can&apos;t scan the QR? Copy this code and paste it into{" "}
            <strong className="text-foreground">Connect using Code</strong> on the
            other device.
          </p>
        </div>
      )}
    </div>
  );
}
