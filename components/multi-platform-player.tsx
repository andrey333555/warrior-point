"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { parseVideoUrl, type ParsedVideoSource } from "@/components/video-player";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

function NeonPlayIcon({ size = 56, color = "#e879f9" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <polygon points="6,4 21,12 6,20" fill={color} />
    </svg>
  );
}

type MultiPlatformPlayerProps = {
  src?: string;
  accent?: string;
  className?: string;
  posterUrl?: string;
  caption?: string;
};

export function MultiPlatformPlayer({
  src,
  accent = "#e879f9",
  className = "",
  posterUrl,
  caption = "HIGHLIGHT · Multi-Platform Sync (YouTube, VK, Rutube)",
}: MultiPlatformPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const source: ParsedVideoSource | null = src ? parseVideoUrl(src) : null;
  const thumb = posterUrl ?? source?.thumbnailUrl;
  const showThumb = Boolean(thumb) && !thumbFailed;
  const canPlay = Boolean(source);

  const handlePlay = useCallback(() => {
    if (canPlay) setPlaying(true);
  }, [canPlay]);

  if (playing && source) {
    if (source.platform === "youtube") {
      return (
        <div className={`w-full ${className}`}>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <ReactPlayer
              src={src}
              playing
              controls
              width="100%"
              height="100%"
              style={{ position: "absolute", inset: 0 }}
            />
          </div>
          <p className="mt-2 text-center font-[family-name:var(--font-geist-mono)] text-[7px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {caption}
          </p>
        </div>
      );
    }

    return (
      <div className={`w-full ${className}`}>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={source.embedUrl}
            title="Warrior Point Video"
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="mt-2 text-center font-[family-name:var(--font-geist-mono)] text-[7px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {caption}
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        aria-label={canPlay ? "Воспроизвести видео" : "Видео плеер"}
        onClick={handlePlay}
        className="group relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl border bg-neutral-950/90 focus:outline-none"
        style={{
          borderColor: `${accent}55`,
          boxShadow: `0 0 32px -8px ${accent}60`,
        }}
      >
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            onError={() => setThumbFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-65 transition-opacity group-hover:opacity-85"
          />
        ) : null}

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${accent}18 0%, rgba(0,0,0,0.82) 70%)`,
          }}
        />

        <motion.span
          className="relative flex items-center justify-center rounded-full border"
          style={{
            width: 72,
            height: 72,
            background: "rgba(0,0,0,0.7)",
            borderColor: `${accent}90`,
          }}
          animate={{
            boxShadow: [
              `0 0 16px -2px ${accent}`,
              `0 0 36px 4px ${accent}`,
              `0 0 16px -2px ${accent}`,
            ],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span style={{ marginLeft: 5 }}>
            <NeonPlayIcon size={36} color={accent} />
          </span>
        </motion.span>
      </button>

      <p
        className="mt-2.5 text-center font-[family-name:var(--font-geist-mono)] text-[7px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-zinc-400"
        style={{ textShadow: `0 0 12px ${accent}40` }}
      >
        {caption}
      </p>
    </div>
  );
}
