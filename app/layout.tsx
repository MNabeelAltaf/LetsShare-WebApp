import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DroplySessionProvider } from "@/hooks/useDroplySession";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SwipeNavigator } from "@/components/layout/swipe-navigator";
import { AppInitSplash } from "@/components/pwa/app-init-splash";

export const metadata: Metadata = {
  title: "LetsShare – Offline File Transfer",
  description:
    "Send files directly between devices over Wi-Fi or Hotspot using a QR code.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LetsShare",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#181816",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col bg-background text-foreground pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-x-hidden">
        <DroplySessionProvider>
          <AppInitSplash />
          <Navbar />
          <SwipeNavigator>
            <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
              {children}
            </main>
          </SwipeNavigator>
          <Footer />
        </DroplySessionProvider>
      </body>
    </html>
  );
}
