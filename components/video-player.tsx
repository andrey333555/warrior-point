"use client";

/**
 * VideoPlayer — iframe-based video modal supporting:
 *   VK Видео, YouTube, Rutube, прямые ссылки.
 *
 * Usage:
 *   <VideoPlayer
 *     src="https://vk.com/video-190459948_456239028"
 *     posterInitials="ВК"
 *     accent="#22d3ee"
 *   />
 *
 * Trigger: кнопка Play поверх постера/инициалов.
 * При клике — открывается модальный попап с iframe.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── URL parsing ───────────────────────────────────────────────────────────────

type VideoSource =
  | { platform: "youtube"; embedUrl: string }
  | { platform: "vk";      embedUrl: string }
  | { platform: "rutube";  embedUrl: string }
  | { platform: "direct";  embedUrl: string };

function parseVideoUrl(raw: string): VideoSource | null {
  try {
    // YouTube — watch?v=ID or youtu.be/ID or shorts/ID
    const yt = raw.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    );
    if (yt)
      return {
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`,
      };

    // VK Видео — vk.com/video{oid}_{id} or vkvideo.ru/video{oid}_{id}
    const vk = raw.match(/video(-?\d+)_(\d+)/);
    if (vk)
      return {
        platform: "vk",
        embedUrl: `https://vkvideo.ru/video_ext.php?oid=${vk[1]}&id=${vk[2]}&hd=2&autoplay=1`,
      };

    // Rutube — rutube.ru/video/{hash} or play/embed/{hash}
    const rt = raw.match(/rutube\.ru\/(?:video|play\/embed)\/([a-f0-9]+)/i);
    if (rt)
      return {
        platform: "rutube",
        embedUrl: `https://rutube.ru/play/embed/${rt[1]}?autoplay=1`,
      };

    // Fallback: treat as direct embed URL
    if (raw.startsWith("http")) return { platform: "direct", embedUrl: raw };
  } catch {
    // invalid URL — fall through
  }
  return null;
}

const PLATFORM_LABELS: Record<VideoSource["platform"], string> = {
  youtube: "YouTube",
  vk:      "VK Видео",
  rutube:  "Rutube",
  direct:  "Видео",
};

// ── Play button SVG ───────────────────────────────────────────────────────────

function PlayIcon({ size = 24, color = "#ffffff" }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      aria-hidden
    >
      <polygon points="5,3 22,12 5,21" />
    </svg>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function VideoModal({
  source,
  accent,
  onClose,
}: {
  source: VideoSource;
  accent: string;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 px-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border"
        style={{
          borderColor: `${accent}45`,
          boxShadow: `0 0 80px -16px ${accent}70, 0 0 0 1px ${accent}20`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-black/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px 1px ${accent}` }}
            />
            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
              {PLATFORM_LABELS[source.platform]} · Хайлайт Виктора Колесника
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/[0.1] bg-black/60 px-2.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:border-white/25 hover:text-zinc-200"
          >
            esc
          </button>
        </div>

        {/* Iframe */}
        <div className="aspect-video w-full bg-black">
          <iframe
            src={source.embedUrl}
            title="Warrior Point Video"
            className="h-full w-full"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        </div>

        {/* Neon bottom glow strip */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }}
        />
      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type VideoPlayerProps = {
  /** Video URL (VK, YouTube, Rutube, or direct iframe src). */
  src?: string;
  /** Fighter initials shown when no thumbnail is available. */
  posterInitials?: string;
  /** Neon accent colour. */
  accent?: string;
  /** Size of the trigger button area in px. */
  size?: number;
  /** Optional poster image URL (if provided, shown behind Play icon). */
  posterUrl?: string;
};

export function VideoPlayer({
  src,
  posterInitials = "ВК",
  accent = "#22d3ee",
  size = 80,
  posterUrl,
}: VideoPlayerProps) {
  const [open, setOpen] = useState(false);
  const source = src ? parseVideoUrl(src) : null;
  const uid = useId();
  const btnRef = useRef<HTMLButtonElement>(null);

  const openModal = useCallback(() => {
    if (source) setOpen(true);
  }, [source]);

  const closeModal = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  const hasSrc = Boolean(source);

  return (
    <>
      {/* ── Trigger button ──────────────────────────────────────────── */}
      <motion.button
        ref={btnRef}
        type="button"
        id={`video-trigger-${uid}`}
        aria-label={hasSrc ? "Воспроизвести хайлайт" : "Видео недоступно"}
        disabled={!hasSrc}
        onClick={openModal}
        whileTap={hasSrc ? { scale: 0.94 } : {}}
        className="relative flex items-center justify-center overflow-hidden rounded-none focus:outline-none"
        style={{ width: size, height: size }}
      >
        {/* Poster or initials */}
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={posterInitials}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="font-[family-name:var(--font-geist-mono)] font-black uppercase leading-none select-none"
            style={{
              fontSize: size * 0.32,
              color: accent,
              textShadow: `0 0 ${size * 0.18}px ${accent}80`,
            }}
          >
            {posterInitials}
          </span>
        )}

        {/* Play icon overlay */}
        {hasSrc && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            whileHover={{ opacity: 1 }}
            initial={{ opacity: 0.55 }}
          >
            <div
              className="flex items-center justify-center rounded-full border"
              style={{
                width: size * 0.42,
                height: size * 0.42,
                background: "rgba(0,0,0,0.7)",
                borderColor: `${accent}60`,
                boxShadow: `0 0 ${size * 0.15}px -4px ${accent}`,
              }}
            >
              <PlayIcon size={size * 0.18} color={accent} />
            </div>
          </motion.div>
        )}

        {/* No-src placeholder */}
        {!hasSrc && (
          <span
            className="absolute bottom-1.5 right-1.5 rounded-full border px-1.5 py-[1px] font-[family-name:var(--font-geist-mono)] text-[7px] uppercase tracking-[0.18em] text-zinc-600"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.6)" }}
          >
            ▶ soon
          </span>
        )}
      </motion.button>

      {/* ── Modal portal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && source ? (
          <VideoModal key="video-modal" source={source} accent={accent} onClose={closeModal} />
        ) : null}
      </AnimatePresence>
    </>
  );
}

// ── Convenience: detect platform label from URL ───────────────────────────────

export function detectPlatform(url: string): string {
  const src = parseVideoUrl(url);
  return src ? PLATFORM_LABELS[src.platform] : "Видео";
}
