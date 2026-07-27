import type { Metadata, Viewport } from "next";

import { LifeDockDataProvider } from "@/components/LifeDockDataProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LifeDock",
    template: "%s - LifeDock"
  },
  description: "Everything important in your family's life, organised under one roof.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LifeDock"
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f4ec"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LifeDockDataProvider>
          <div className="min-h-screen pb-28">
            <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </LifeDockDataProvider>
      </body>
    </html>
  );
}
