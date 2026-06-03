import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { CyberNav } from "@/components/cyber-nav";
import { TelegramTheme } from "@/components/telegram-theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Warrior Point",
  description: "Global combat ledger · Warrior Passport · Leaderboard",
  // PWA / TWA meta
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Warrior Point",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",          // safe-area for notched iPhones
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Telegram Mini App / TWA compatibility */}
        <meta name="telegram:web-app" content="1" />
        {/* Prevent iOS Safari bounce-scroll */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className="flex min-h-full flex-col overflow-x-hidden bg-zinc-950 text-zinc-100"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/*
         * Telegram Web App SDK — loaded before interactive so themeParams
         * are available before first render. Safe no-op in non-Telegram env.
         */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />

        {/* Reads Telegram theme and sets --tg-* CSS vars on :root */}
        <TelegramTheme />

        <div className="flex flex-1 flex-col">{children}</div>
        <CyberNav />
      </body>
    </html>
  );
}
