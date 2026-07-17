import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { AppChrome } from "@/components/app-chrome";
import { TelegramTheme } from "@/components/telegram-theme";
import { ThemeProvider } from "@/components/theme-provider";
import { StoreInit } from "@/components/StoreInit";
import { DonateUiProvider } from "@/hooks/use-donate-ui";
import { Providers } from "./providers";
import { GuestLinkActivatorRoot } from "@/components/guest-link-activator-root";
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
        {/* Apply saved theme before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem("wp.theme.v1");var p=r?JSON.parse(r):"dark";if(["dark","light","hybrid","auto"].indexOf(p)<0)p="dark";var m=p;if(p==="auto"){var h=new Date().getHours();m=h>=7&&h<20?"light":"dark"}var el=document.documentElement;el.dataset.theme=m;el.dataset.themePref=p;el.classList.add("theme-"+m);el.style.backgroundColor=m==="light"?"#ffffff":m==="hybrid"?"#f7f5f0":"#0a0a0a"}catch(e){document.documentElement.dataset.theme="dark"}})();`,
          }}
        />
      </head>
      <body
        className="min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased"
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
        <ThemeProvider />

        <StoreInit />
        <Providers>
          <DonateUiProvider>
            <GuestLinkActivatorRoot />
            {children}
            <AppChrome />
          </DonateUiProvider>
        </Providers>
      </body>
    </html>
  );
}
