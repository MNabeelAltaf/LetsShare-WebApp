"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ArrowUpRight,
  ArrowDownLeft,
  Wifi,
  Moon,
  Sun,
  Download,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { InstallAppModal } from "@/components/pwa/install-app-modal";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const {
    canInstallPWA,
    isInstalledPWA,
    promptInstallPWA,
    setIsInstallModalOpen,
  } = useDroplySession();

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("letsshare-theme");
    const isDark = saved ? saved === "dark" : false;
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("letsshare-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/send", label: "Send", icon: ArrowUpRight },
    { href: "/receive", label: "Receive", icon: ArrowDownLeft },
    { href: "/setup", label: "Wi-Fi", icon: Wifi },
  ];

  return (
    <>
      {/* Clean Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-xs font-black tracking-tighter text-background">
              LS
            </span>
            <span className="text-base font-bold tracking-tight">
              LetsShare
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {!isInstalledPWA && (
              <button
                type="button"
                onClick={() => {
                  if (canInstallPWA) {
                    void promptInstallPWA();
                  } else {
                    setIsInstallModalOpen(true);
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-foreground/15 bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <Download className="size-3.5 text-primary" />
                <span>Install App</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Switch theme"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary"
            >
              {darkMode ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Bottom App Bar */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-4 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 transition-colors",
                  active
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 bg-primary" />
                )}
                <Icon className="size-5" />
                <span className="text-[11px] leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <InstallAppModal />
    </>
  );
}
