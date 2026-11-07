"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 py-5 text-center">
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <span>
          Your files travel directly between your devices. Droply does not
          upload or store your files.
        </span>
      </div>
    </footer>
  );
}
