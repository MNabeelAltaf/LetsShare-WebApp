import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DroplySessionProvider } from "@/hooks/useDroplySession";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

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
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#181816",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground pb-20">
        <DroplySessionProvider>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6">
            {children}
          </main>
          <Footer />
        </DroplySessionProvider>
      </body>
    </html>
  );
}
