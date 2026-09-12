import type { Metadata, Viewport } from "next";

import { AccountDataBoundary } from "@/components/AccountDataBoundary";
import { getAuthenticatedUser } from "@/lib/auth";

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
    icon: [
      { url: "/icons/favicon-16.png?v=dark-green-20260912", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png?v=dark-green-20260912", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png?v=dark-green-20260912", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=dark-green-20260912", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png?v=dark-green-20260912", sizes: "180x180", type: "image/png" }
    ]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#edf3e9"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getAuthenticatedUser();
  return (
    <html lang="en">
      <body>
        <AccountDataBoundary key={user?.id ?? "signed-out"} initialAccountId={user?.id ?? null}>
          <div data-app-shell className="min-h-[100dvh]">
            <main className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col overflow-x-clip px-4 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </AccountDataBoundary>
      </body>
    </html>
  );
}
