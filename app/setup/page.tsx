"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Laptop,
  ShieldAlert,
  CheckCircle2,
  Send,
  Download,
  Router,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlatformTab = "android" | "iphone" | "windows";

export default function HotspotSetupPage() {
  const [activeTab, setActiveTab] = useState<PlatformTab>("android");
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNumber)
        ? prev.filter((s) => s !== stepNumber)
        : [...prev, stepNumber]
    );
  };

  const wizardSteps = [
    {
      num: 1,
      title: "Turn OFF Mobile Data",
      desc: "Disable cellular/mobile data on the hotspot host device so zero mobile data is consumed during your transfer.",
    },
    {
      num: 2,
      title: "Enable Wi-Fi Hotspot on Device A",
      desc: "Manually activate the built-in Wi-Fi Hotspot / Personal Hotspot in your device's system settings.",
    },
    {
      num: 3,
      title: "Connect Device B to the Hotspot",
      desc: "On the second device, open Wi-Fi settings and connect to Device A's hotspot SSID.",
    },
    {
      num: 4,
      title: "Open Droply on Both Devices",
      desc: "Launch the installed Droply PWA (or cached browser tab) on both devices.",
    },
    {
      num: 5,
      title: "Start QR Pairing",
      desc: "Select files on the Sender, scan the Offer QR on the Receiver, and scan the Answer QR back.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="default">Offline Network Wizard</Badge>
          <span className="text-xs text-muted-foreground">
            Zero Internet • Local Subnet WebRTC
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Wi-Fi & Mobile Hotspot Setup Guide
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          WebRTC DataChannels require an IP route between your two devices. When
          no Wi-Fi router is nearby, one device can act as a local Wi-Fi Hotspot
          with mobile data turned completely OFF.
        </p>
      </div>

      {/* Honest Browser Limitation Note (Section 4 & 10 requirement) */}
      <div className="flex items-start gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4 text-xs text-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
        <div>
          <span className="font-semibold">
            Why Manual Hotspot Activation is Required:
          </span>{" "}
          Web browsers run in a secure sandbox and do not provide an API to
          programmatically toggle your operating system&apos;s Wi-Fi hotspot or
          read Wi-Fi SSIDs. Follow the quick steps below to enable your hotspot
          in seconds.
        </div>
      </div>

      {/* Interactive 5-Step Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>5-Step Offline Hotspot Checklist</CardTitle>
          <CardDescription>
            Click each step as you complete it to verify your local peer-to-peer
            setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {wizardSteps.map((step) => {
              const checked = completedSteps.includes(step.num);
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => toggleStep(step.num)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                    checked
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border/70 bg-muted/20 hover:border-teal-500/40"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                        checked
                          ? "bg-emerald-500 text-white"
                          : "bg-teal-500/20 text-teal-600 dark:text-teal-400"
                      )}
                    >
                      {step.num}
                    </span>
                    {checked && (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    )}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-foreground">
                    {step.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform-Specific Hotspot Instructions (Android, iPhone, Windows) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            OS-Specific Hotspot Activation Instructions
          </h2>

          <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
            {(
              [
                { id: "android", label: "Android Hotspot", icon: Smartphone },
                { id: "iphone", label: "iPhone Personal Hotspot", icon: Smartphone },
                { id: "windows", label: "Windows Mobile Hotspot", icon: Laptop },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-background text-teal-600 shadow-2xs dark:text-teal-400"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "android" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="default">Android 10 – 15+</Badge>
                <span className="text-xs text-muted-foreground">
                  Works without SIM card or Mobile Data
                </span>
              </div>
              <CardTitle className="mt-1">
                Activating Wi-Fi Hotspot on Android
              </CardTitle>
              <CardDescription>
                Android supports creating a local Wi-Fi hotspot even when Mobile
                Data is turned off.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal space-y-2.5 pl-5 text-xs sm:text-sm text-foreground/90">
                <li>
                  Swipe down from the top of your screen to open the{" "}
                  <strong>Quick Settings</strong> panel and tap{" "}
                  <strong>Mobile Data</strong> to turn it <strong>OFF</strong>.
                </li>
                <li>
                  Open <strong>Settings → Network &amp; internet → Hotspot &amp; tethering → Wi-Fi hotspot</strong>{" "}
                  (on Samsung: <strong>Settings → Connections → Mobile Hotspot and Tethering</strong>).
                </li>
                <li>
                  Toggle <strong>Use Wi-Fi hotspot</strong> to <strong>ON</strong>.
                </li>
                <li>
                  Note the <strong>Hotspot name (SSID)</strong> and{" "}
                  <strong>Password</strong> shown on screen.
                </li>
                <li>
                  On the second device (laptop or another phone), connect to
                  that Wi-Fi network. If prompted &ldquo;This network has no internet
                  access — stay connected?&rdquo;, tap{" "}
                  <strong>Always Connect / Keep Wi-Fi Connection</strong>.
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        {activeTab === "iphone" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="default">iOS / iPadOS</Badge>
                <span className="text-xs text-muted-foreground">
                  Personal Hotspot Guide
                </span>
              </div>
              <CardTitle className="mt-1">
                Activating Personal Hotspot on iPhone
              </CardTitle>
              <CardDescription>
                Note: iOS requires Cellular Data to be toggled on solely to
                enable the Personal Hotspot switch, or you can connect the
                iPhone as a client to an Android/Windows hotspot with zero data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal space-y-2.5 pl-5 text-xs sm:text-sm text-foreground/90">
                <li>
                  <strong>Recommended Zero-Data Method:</strong> Enable the
                  Wi-Fi Hotspot on the Android phone or Windows PC first, then on
                  your iPhone go to <strong>Settings → Wi-Fi</strong> and join
                  that hotspot.
                </li>
                <li>
                  <strong>If hosting from iPhone:</strong> Open{" "}
                  <strong>Settings → Personal Hotspot</strong> and toggle{" "}
                  <strong>Allow Others to Join</strong>.
                </li>
                <li>
                  Enable <strong>Maximize Compatibility</strong> if the
                  receiving device has trouble discovering the 5 GHz hotspot.
                </li>
                <li>
                  Keep the Personal Hotspot screen open until the second device
                  connects to the iPhone&apos;s Wi-Fi network.
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        {activeTab === "windows" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="default">Windows 10 &amp; Windows 11</Badge>
                <span className="text-xs text-muted-foreground">
                  Laptop / Desktop Wi-Fi Hotspot
                </span>
              </div>
              <CardTitle className="mt-1">
                Activating Mobile Hotspot on Windows
              </CardTitle>
              <CardDescription>
                Windows laptops can broadcast a local Wi-Fi network for phones
                and other laptops to join directly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal space-y-2.5 pl-5 text-xs sm:text-sm text-foreground/90">
                <li>
                  Press <strong>Win + I</strong> to open Windows Settings and navigate to{" "}
                  <strong>Network &amp; internet → Mobile hotspot</strong>.
                </li>
                <li>
                  Toggle <strong>Mobile hotspot</strong> to <strong>On</strong>{" "}
                  (select <strong>Wi-Fi</strong> under &ldquo;Share my internet
                  connection over&rdquo;).
                </li>
                <li>
                  Expand <strong>Properties</strong> to view the{" "}
                  <strong>Network name (SSID)</strong> and{" "}
                  <strong>Network password</strong>.
                </li>
                <li>
                  Connect your smartphone or second laptop to that Wi-Fi SSID.
                </li>
                <li>
                  <strong>Firewall Tip:</strong> Ensure your Windows network
                  profile is set to <strong>Private network</strong> or allow
                  your browser (Chrome/Edge/Firefox) through Windows Defender
                  Firewall for UDP peer-to-peer traffic.
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Troubleshooting Common Local Network Blockers */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Router className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Router Troubleshooting
              </span>
            </div>
            <CardTitle className="text-base">
              AP / Client Isolation on Guest Wi-Fi
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground space-y-2">
            <p>
              Public Wi-Fi networks (hotels, cafes, university campuses, or
              &ldquo;Guest&rdquo; router SSIDs) often enable{" "}
              <strong>AP Isolation (Client Isolation)</strong>, which blocks
              devices on the same router from talking directly to each other.
            </p>
            <p className="font-medium text-foreground">
              Fix: Switch to a personal mobile hotspot on one of your devices,
              or switch Droply&apos;s ICE Mode to &ldquo;Online STUN&rdquo; if internet is
              available.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <ShieldAlert className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Browser mDNS &amp; Permissions
              </span>
            </div>
            <CardTitle className="text-base">
              Local IP Discovery &amp; Firewalls
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground space-y-2">
            <p>
              Modern browsers may mask local LAN IP addresses using{" "}
              <code>.local</code> mDNS hostnames until camera permission is
              granted, and OS firewalls may block incoming UDP packets on
              &ldquo;Public&rdquo; Wi-Fi profiles.
            </p>
            <p className="font-medium text-foreground">
              Fix: Allow camera permission when scanning QR codes and ensure
              both devices remain awake on the pairing screen until the
              DataChannel shows &ldquo;Open&rdquo;.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-border/80 bg-card p-6">
        <Link
          href="/send"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-500 dark:bg-teal-500 dark:text-zinc-950"
        >
          <Send className="size-4" />
          Start Sending Files
        </Link>
        <Link
          href="/receive"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <Download className="size-4 text-teal-500" />
          Start Receiving Files
        </Link>
      </div>
    </div>
  );
}

