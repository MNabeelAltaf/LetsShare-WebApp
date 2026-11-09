"use client";

import React from "react";

export function Footer() {
  return (
    <footer className="mt-auto py-4 text-center space-y-1">
      <p className="mx-auto max-w-lg px-4 text-[11px] text-muted-foreground">
        Files move directly between your devices. Nothing is uploaded online.
      </p>
      <p className="mx-auto max-w-lg px-4 text-[11px] font-medium text-muted-foreground/80">
        Developed by <span className="font-bold text-foreground">Nabeel</span>
      </p>
    </footer>
  );
}
