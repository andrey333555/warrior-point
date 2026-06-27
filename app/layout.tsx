import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { CyberNav } from "@/components/cyber-nav";
import { TelegramTheme } from "@/components/telegram-theme";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Round 23 — Видео",
  description: "Агрегатор видео единоборств",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Round 23",
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#C9A84C" },
    { media: "(prefers-color-scheme: light)", color: "#C9A84C" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Telegram Mini App / TWA compatibility */}
        <meta name="telegram:web-app" content="1" />
        {/* Prevent iOS Safari bounce-scroll */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className="min-h-full bg-[#0A0A0A] text-zinc-100 antialiased"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/*
         * Telegram Web App SDK — loaded before interactive so themeParams
         * are available before first render. Safe no-op in non-Telegram env.
         */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />

        {/* Reads Telegram theme and sets --tg-* CSS vars on :root */}
        <TelegramTheme />

        <Providers>{children}</Providers>
        <CyberNav />
        <PwaInstallBanner />
      </body>
    </html>
  );
}
