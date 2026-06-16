"use client";

/**
 * PwaInstallBanner — Dopamine install hint for iOS / Android.
 *
 * Shows a neon bottom sheet when the app is opened in a plain browser
 * (not already installed as a PWA or running inside Telegram).
 *
 * Rules:
 *   • Only appears after a 2 s delay (non-intrusive).
 *   • Dismissed forever via localStorage flag (30-day TTL).
 *   • Never shown in Telegram WebApp or when already in standalone mode.
 *   • Platform-specific instruction text for iOS vs Android.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "wp_pwa_banner_dismissed_at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // PWA / iOS Safari "Add to Home Screen"
  if ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone) {
    return true;
  }
  // Android / Chromium PWA
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

function isInsideTelegram(): boolean {
  if (typeof window === "undefined") return false;
  // Telegram sets window.Telegram.WebApp; use a loose check to avoid type conflicts
  const tg = (window as unknown as Record<string, unknown>)["Telegram"];
  const hasWebApp = !!(tg && typeof tg === "object" && "WebApp" in tg);
  const hasParam = new URLSearchParams(window.location.search).has("tgWebAppVersion");
  return hasWebApp || hasParam;
}

function wasDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function saveDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // quota issue — ignore
  }
}

// ── Platform-specific copy ─────────────────────────────────────────────────

const COPY: Record<Platform, { title: string; body: string; cta: string }> = {
  ios: {
    title: "Установи Warrior Point",
    body: "Нажми «Поделиться» → «На экран «Домой»» — и тренируйся в один клик ⚡",
    cta: "Ясно",
  },
  android: {
    title: "Установи Warrior Point",
    body: "Нажми «Добавить на главный экран» в меню браузера — и тренируйся в один клик ⚡",
    cta: "Понял",
  },
  other: {
    title: "Установи Warrior Point",
    body: "Добавь приложение на рабочий стол через меню браузера ⚡",
    cta: "Ок",
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    // Skip if already a PWA, inside Telegram, or previously dismissed
    if (isStandalone() || isInsideTelegram() || wasDismissed()) return;

    const detected = detectPlatform();
    // Only show on mobile platforms — desktop users don't need this nudge
    if (detected === "other") return;

    setPlatform(detected);

    const tid = window.setTimeout(() => setVisible(true), 2000);
    return () => window.clearTimeout(tid);
  }, []);

  function dismiss() {
    setVisible(false);
    saveDismissed();
  }

  const copy = COPY[platform];

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="pwa-banner"
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "110%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          role="dialog"
          aria-live="polite"
          aria-label="Установи Warrior Point"
          className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[200] overflow-hidden rounded-2xl border border-cyan-400/35 bg-zinc-950/96 p-[1px] shadow-[0_0_50px_-10px_rgba(0,240,255,0.45)] backdrop-blur-xl sm:inset-x-auto sm:left-1/2 sm:w-[360px] sm:-translate-x-1/2"
        >
          {/* Top cyan glow stripe */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg,transparent,rgba(0,240,255,0.7),transparent)",
            }}
          />

          <div className="rounded-[calc(1rem-1px)] bg-gradient-to-br from-cyan-500/[0.07] via-black/90 to-black/95 px-5 py-4">
            <div className="flex items-start gap-4">
              {/* Neon icon */}
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/10"
                style={{ boxShadow: "0 0 18px -4px rgba(0,240,255,0.55)" }}
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  width={22}
                  height={22}
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z"
                    stroke="#00F0FF"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="#00F0FF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  {copy.title}
                </p>
                <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11.5px] leading-relaxed text-zinc-300">
                  {copy.body}
                </p>
              </div>
            </div>

            {/* Platform hint for iOS */}
            {platform === "ios" && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-zinc-400">
                  Safari
                </span>
                <span className="text-zinc-600">→</span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-zinc-200">
                  □ Поделиться
                </span>
                <span className="text-zinc-600">→</span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-zinc-200">
                  На экран «Домой»
                </span>
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 w-full rounded-full border border-cyan-400/35 bg-cyan-500/[0.08] py-2 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200 transition-colors hover:border-cyan-300 hover:bg-cyan-500/[0.14]"
            >
              {copy.cta}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
