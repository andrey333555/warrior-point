"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseVideoUrl } from "@/components/video-player";
import { DEMO_HIGHLIGHT_URL } from "@/components/feed/types";

type FloatingPlayerProps = {
  src?: string;
  title?: string;
  subtitle?: string;
  accent?: string;
};

export function FloatingPlayer({
  src = DEMO_HIGHLIGHT_URL,
  title = "HIGHLIGHT · RCC",
  subtitle = "SUB · R3 · Боец Бойцов",
  accent = "#e879f9",
}: FloatingPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const source = parseVideoUrl(src);
  const thumb = source?.thumbnailUrl;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 flex justify-center px-3">
      <div className="pointer-events-auto w-full max-w-[392px]">
        <AnimatePresence initial={false}>
          {expanded && source ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 8, height: 0 }}
              className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl"
              style={{ boxShadow: `0 0 32px -8px ${accent}80` }}
            >
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={source.embedUrl}
                  title={title}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.1] bg-black/80 p-2.5 backdrop-blur-xl transition-colors hover:border-white/20"
          style={{ boxShadow: `0 8px 32px -12px ${accent}60` }}
        >
          <div
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border bg-neutral-950"
            style={{ borderColor: `${accent}55` }}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="h-full w-full object-cover opacity-80" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: `${accent}18` }}
              >
                <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
                  <polygon points="8,5 19,12 8,19" fill={accent} />
                </svg>
              </div>
            )}
            <span
              className="absolute inset-0 flex items-center justify-center bg-black/30"
              aria-hidden
            >
              <span
                className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full border"
                style={{ borderColor: `${accent}90`, background: "rgba(0,0,0,0.65)" }}
              >
                <svg viewBox="0 0 24 24" width={10} height={10} aria-hidden>
                  <polygon points="8,5 19,12 8,19" fill={accent} />
                </svg>
              </span>
            </span>
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p
              className="truncate font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] text-white"
            >
              {title}
            </p>
            <p className="truncate font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.1em] text-zinc-500">
              {subtitle}
            </p>
          </div>

          <span
            className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.2em]"
            style={{ color: accent }}
          >
            {expanded ? "×" : "▶"}
          </span>
        </button>
      </div>
    </div>
  );
}
