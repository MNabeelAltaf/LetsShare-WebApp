"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PlatformTab = "android" | "iphone" | "windows";

export default function HotspotSetupPage() {
  const [activeTab, setActiveTab] = useState<PlatformTab>("android");

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Wi-Fi &amp; Hotspot Guide
        </p>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Share Without Internet
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Connect both devices to the same Wi-Fi router, or turn on one
          phone&apos;s Hotspot.
        </p>
      </div>

      {/* 3 Numbered Rows */}
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {[
          {
            num: "01",
            title: "Turn OFF Mobile Data",
            desc: "So no mobile internet data is used during your transfer.",
          },
          {
            num: "02",
            title: "Turn ON Wi-Fi Hotspot",
            desc: "Enable the Hotspot in one device's settings.",
          },
          {
            num: "03",
            title: "Join That Hotspot",
            desc: "Connect the second device to that Hotspot Wi-Fi name.",
          },
        ].map((step) => (
          <div key={step.num} className="flex items-start gap-3.5 p-4">
            <span className="font-mono text-xs font-bold text-primary pt-0.5">
              {step.num}
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {step.title}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Device Tabs */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
          {(
            [
              { id: "android", label: "Android" },
              { id: "iphone", label: "iPhone" },
              { id: "windows", label: "Windows" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg py-1.5 text-xs font-bold transition-all",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "android" && (
          <ol className="list-decimal space-y-2 pl-5 text-xs text-foreground">
            <li>
              Swipe down from the top and turn <strong>Mobile Data OFF</strong>.
            </li>
            <li>
              Open <strong>Settings → Network → Hotspot</strong> and turn{" "}
              <strong>Wi-Fi Hotspot ON</strong>.
            </li>
            <li>Connect the other device to that Wi-Fi name.</li>
          </ol>
        )}

        {activeTab === "iphone" && (
          <ol className="list-decimal space-y-2 pl-5 text-xs text-foreground">
            <li>
              Turn on the Hotspot on the Android or Windows device first and
              join its Wi-Fi from your iPhone.
            </li>
            <li>
              Or open <strong>Settings → Personal Hotspot</strong> on iPhone and
              enable <strong>Allow Others to Join</strong>.
            </li>
          </ol>
        )}

        {activeTab === "windows" && (
          <ol className="list-decimal space-y-2 pl-5 text-xs text-foreground">
            <li>
              Open{" "}
              <strong>Settings → Network &amp; Internet → Mobile hotspot</strong>.
            </li>
            <li>
              Switch <strong>Mobile hotspot ON</strong> and connect your phone
              to that Wi-Fi name.
            </li>
          </ol>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/send"
          className="flex h-11 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground"
        >
          Send Files
        </Link>
        <Link
          href="/receive"
          className="flex h-11 items-center justify-center rounded-xl border border-border bg-card text-xs font-bold text-foreground"
        >
          Receive Files
        </Link>
      </div>
    </div>
  );
}
