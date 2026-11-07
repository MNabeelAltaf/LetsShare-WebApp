import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DroplySessionProvider } from "@/hooks/useDroplySession";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Droply – Easy Offline File Sharing",
  description:
    "Share files directly between devices using a QR code. No internet, no uploads, no accounts needed.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Droply",
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
  themeColor: "#4f46e5",
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
      <body className="min-h-full flex flex-col bg-background text-foreground pb-20 md:pb-0 selection:bg-indigo-500/20 selection:text-indigo-600">
        <DroplySessionProvider>
          <Navbar />
          <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
            {children}
          </main>
          <Footer />
        </DroplySessionProvider>
      </body>
    </html>
  );
}
