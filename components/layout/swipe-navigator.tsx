"use client";

import React, { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDroplySession } from "@/hooks/useDroplySession";

const PRIMARY_ROUTES = ["/", "/send", "/receive", "/setup"] as const;

const MIN_SWIPE_DISTANCE_PX = 75;
const MAX_VERTICAL_DRIFT_PX = 50;
const HORIZONTAL_DOMINANCE_RATIO = 1.8;
const MAX_SWIPE_DURATION_MS = 650;

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, video, canvas, [role="button"], [role="slider"], [data-no-swipe="true"]'
    )
  );
}

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { connectionState } = useDroplySession();

  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    ignore: boolean;
  } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }

    // Do not hijack gestures when an active transfer is connected or on interactive targets
    const ignore =
      connectionState === "connected" || isInteractiveElement(e.target);

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now(),
      ignore,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || start.ignore || e.changedTouches.length !== 1) {
      return;
    }

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const elapsed = performance.now() - start.time;

    // Must be a deliberate horizontal swipe that does not conflict with vertical scrolling
    if (
      elapsed > MAX_SWIPE_DURATION_MS ||
      absDx < MIN_SWIPE_DISTANCE_PX ||
      absDy > MAX_VERTICAL_DRIFT_PX ||
      absDx < absDy * HORIZONTAL_DOMINANCE_RATIO
    ) {
      return;
    }

    const currentIndex = PRIMARY_ROUTES.findIndex((route) =>
      route === "/" ? pathname === "/" : pathname.startsWith(route)
    );
    if (currentIndex === -1) return;

    // Swipe Left (dx < 0) -> next tab; Swipe Right (dx > 0) -> previous tab
    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < PRIMARY_ROUTES.length) {
      router.push(PRIMARY_ROUTES[nextIndex]);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col w-full touch-pan-y"
    >
      {children}
    </div>
  );
}

