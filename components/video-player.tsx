"use client";

/**
 * VideoPlayer — multi-platform iframe video player with neon lightbox.
 *
 * Supports: VK Видео, YouTube, Rutube, прямые iframe-ссылки.
 *
 * Features:
 *   - Auto-detects platform from a standard share URL.
 *   - Auto-derives a thumbnail (YouTube) or renders a neon poster fallback.
 *   - Centre Play button over the thumbnail.
 *   - Click → full-screen Lightbox with spring bloom + neon glow.
 *   - Strict 16:9 aspect ratio inside the modal (safe for Telegram Web App).
 *   - Body scroll lock while open; Escape / × / backdrop all close.
 *
 * Usage:
 *   <VideoPlayer
 *     src="https://vk.com/video-190459948_456239028"
 *     posterInitials="ВК"
 *     accent="#22d3ee"
 *   />
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── URL parsing ───────────────────────────────────────────────────────────────

type Platform = "youtube" | "vk" | "rutube" | "direct";

type VideoSource = {
  platform: Platform;
  embedUrl: string;
  /** Auto-derived thumbnail URL when the platform exposes one. */
  thumbnailUrl?: string;
};

function parseVideoUrl(raw: string): VideoSource | null {
  try {
    // YouTube — watch?v=ID or youtu.be/ID or shorts/ID or embed/ID
    const yt = raw.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    );
    if (yt)
      return {
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0&playsinline=1`,
        thumbnailUrl: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`,
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

const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube",
  vk:      "VK Видео",
  rutube:  "Rutube",
  direct:  "Видео",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlayIcon({ size = 24, color = "#ffffff" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} aria-hidden>
      <polygon points="6,4 21,12 6,20" />
    </svg>
  );
}

function CloseIcon({ size = 16, color = "#e4e4e7" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M6 6 L18 18 M18 6 L6 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Lightbox modal ──────────────────────────────────────────────────────────────

function VideoModal({
  source,
  accent,
  caption,
  onClose,
}: {
  source: VideoSource;
  accent: string;
  caption: string;
  onClose: () => void;
}) {
  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while the lightbox is open (critical for Telegram Web App)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-md"
      style={{
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <motion.div
        // Bloom out from the octagon centre, collapse back on exit
        initial={{ scale: 0.35, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.35, opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border"
        style={{
          borderColor: `${accent}45`,
          boxShadow: `0 0 90px -14px ${accent}80, 0 0 0 1px ${accent}22`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-black/90 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <motion.span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: accent }}
              animate={{ boxShadow: [`0 0 4px 0 ${accent}`, `0 0 10px 2px ${accent}`, `0 0 4px 0 ${accent}`] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
              {PLATFORM_LABELS[source.platform]} · {caption}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть видео"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-black/60 transition-colors hover:border-white/30 hover:bg-white/[0.06]"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Iframe — strict 16:9 */}
        <div className="aspect-video w-full bg-black">
          <iframe
            src={source.embedUrl}
            title="Warrior Point Video"
            className="h-full w-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
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
  /** Manual poster image URL — overrides any auto-derived thumbnail. */
  posterUrl?: string;
  /** Caption shown in the lightbox header. */
  caption?: string;
};

export function VideoPlayer({
  src,
  posterInitials = "ББ",
  accent = "#22d3ee",
  size = 80,
  posterUrl,
  caption = "Хайлайт бойца",
}: VideoPlayerProps) {
  const [open, setOpen] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
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
  // Prefer manual poster, else auto-derived thumbnail (YouTube), else neon fallback
  const thumb = posterUrl ?? source?.thumbnailUrl;
  const showThumb = Boolean(thumb) && !thumbFailed;

  return (
    <>
      {/* ── Trigger button (media container) ──────────────────────────── */}
      <motion.button
        ref={btnRef}
        type="button"
        id={`video-trigger-${uid}`}
        aria-label={hasSrc ? "Воспроизвести хайлайт" : "Видео недоступно"}
        disabled={!hasSrc}
        onClick={openModal}
        whileTap={hasSrc ? { scale: 0.94 } : undefined}
        whileHover={hasSrc ? { scale: 1.015 } : undefined}
        className="group relative flex items-center justify-center overflow-hidden rounded-none focus:outline-none"
        style={{ width: size, height: size }}
      >
        {/* Thumbnail or neon initials poster */}
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={caption}
            onError={() => setThumbFailed(true)}
            className="h-full w-full object-cover opacity-85 transition-opacity duration-300 group-hover:opacity-100"
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

        {/* Darkening + accent vignette so the Play button stays readable */}
        {hasSrc && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.55) 100%), linear-gradient(180deg, transparent 55%, ${accent}1a 100%)`,
            }}
          />
        )}

        {/* Centre Play button with pulsing neon ring */}
        {hasSrc && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.span
              className="flex items-center justify-center rounded-full border"
              style={{
                width: size * 0.32,
                height: size * 0.32,
                background: "rgba(0,0,0,0.62)",
                borderColor: `${accent}70`,
              }}
              animate={{
                boxShadow: [
                  `0 0 ${size * 0.08}px -2px ${accent}90`,
                  `0 0 ${size * 0.2}px 0px ${accent}`,
                  `0 0 ${size * 0.08}px -2px ${accent}90`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span style={{ marginLeft: size * 0.012 }}>
                <PlayIcon size={size * 0.15} color={accent} />
              </span>
            </motion.span>
          </span>
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

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && source ? (
          <VideoModal
            key="video-modal"
            source={source}
            accent={accent}
            caption={caption}
            onClose={closeModal}
          />
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
