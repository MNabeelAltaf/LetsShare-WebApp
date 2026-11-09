"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const {
    canInstallPWA,
    isInstalledPWA,
    promptInstallPWA,
    setIsInstallModalOpen,
  } = useDroplySession();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("letsshare-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

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
            aria-label="LetsShare Home"
            className="flex items-center gap-2 text-foreground touch-manipulation"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo-light.png"
              alt="LetsShare"
              className="h-7 w-auto object-contain select-none dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo-dark.png"
              alt="LetsShare"
              className="hidden h-7 w-auto object-contain select-none dark:block"
            />
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-foreground/15 bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary active:scale-95 touch-manipulation"
              >
                <Download className="size-3.5 text-primary pointer-events-none" />
                <span className="pointer-events-none">Install App</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Switch theme"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary active:scale-95 touch-manipulation"
            >
              {darkMode ? (
                <Sun className="size-4 pointer-events-none" />
              ) : (
                <Moon className="size-4 pointer-events-none" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Bottom App Bar with Safe Area & Mobile Touch Fixes */}
      <nav
        aria-label="Bottom Navigation"
        data-no-swipe="true"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/98 backdrop-blur-md pb-[env(safe-area-inset-bottom)] transform-gpu pointer-events-auto select-none"
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
                onClick={(e) => {
                  // Ensure reliable navigation across mobile WebViews and sticky touch states
                  if (pathname !== item.href) {
                    e.stopPropagation();
                    router.push(item.href);
                  }
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-lg transition-colors cursor-pointer touch-manipulation active:bg-secondary/70 [-webkit-tap-highlight-color:transparent]",
                  active
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                {active && (
                  <span className="pointer-events-none absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                )}
                <Icon className="pointer-events-none size-5 shrink-0" />
                <span className="pointer-events-none text-[11px] leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <InstallAppModal />
    </>
  );
}
