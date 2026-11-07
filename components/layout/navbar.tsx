"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Send,
  Download,
  Wifi,
  Moon,
  Sun,
  Smartphone,
  Share2,
} from "lucide-react";
import { useDroplySession } from "@/hooks/useDroplySession";
import { InstallAppModal } from "@/components/pwa/install-app-modal";
import { Button } from "@/components/ui/button";
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
    const saved = localStorage.getItem("droply-theme");
    const isDark = saved ? saved === "dark" : false;
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("droply-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/send", label: "Send", icon: Send },
    { href: "/receive", label: "Receive", icon: Download },
    { href: "/setup", label: "Wi-Fi Help", icon: Wifi },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-90"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Share2 className="size-4.5 stroke-[2.4]" />
            </div>
            <span className="text-lg font-bold tracking-tight">Droply</span>
          </Link>

          {/* Desktop Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1 rounded-xl bg-secondary p-1">
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
                    "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                    active
                      ? "bg-card text-indigo-600 shadow-2xs dark:text-indigo-400"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Install App + Theme Toggle */}
          <div className="flex items-center gap-2">
            {!isInstalledPWA && (
              <Button
                size="sm"
                onClick={() => {
                  if (canInstallPWA) {
                    void promptInstallPWA();
                  } else {
                    setIsInstallModalOpen(true);
                  }
                }}
                className="h-8 rounded-full bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500"
              >
                <Smartphone className="size-3.5" />
                <span>Install App</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="size-8 rounded-full"
            >
              {darkMode ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-slate-600" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur-lg shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      >
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
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-xs font-semibold transition-colors",
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active && "bg-indigo-600/10 dark:bg-indigo-400/15"
                )}
              >
                <Icon className="size-4.5" />
              </div>
              <span className="text-[11px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <InstallAppModal />
    </>
  );
}
