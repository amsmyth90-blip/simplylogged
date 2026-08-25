import type { Metadata, Viewport } from "next";

import { DiaryDockDataProvider } from "@/components/DiaryDockDataProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DiaryDock",
    template: "%s - DiaryDock"
  },
  description: "Your digital home, for everyday life.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DiaryDock"
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f4ec"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DiaryDockDataProvider>
          <div data-app-shell className="min-h-[100dvh]">
            <main className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col overflow-x-clip px-4 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </DiaryDockDataProvider>
      </body>
    </html>
  );
}
