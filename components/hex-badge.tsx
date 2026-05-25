"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Accent = "green" | "pink" | "cyan" | "gold";

const ACCENT: Record<
  Accent,
  {
    stroke: string;
    inner: string;
    glow: string;
    halo: string;
    text: string;
    ringFocus: string;
  }
> = {
  green: {
    stroke: "#34d399",
    inner: "rgba(52,211,153,0.42)",
    glow: "rgba(52,211,153,0.5)",
    halo: "rgba(52,211,153,0.28)",
    text: "text-emerald-200",
    ringFocus: "focus-visible:ring-emerald-400/60",
  },
  pink: {
    stroke: "#e879f9",
    inner: "rgba(232,121,249,0.42)",
    glow: "rgba(232,121,249,0.5)",
    halo: "rgba(232,121,249,0.28)",
    text: "text-fuchsia-200",
    ringFocus: "focus-visible:ring-fuchsia-400/60",
  },
  cyan: {
    stroke: "#22d3ee",
    inner: "rgba(34,211,238,0.42)",
    glow: "rgba(34,211,238,0.5)",
    halo: "rgba(34,211,238,0.28)",
    text: "text-cyan-200",
    ringFocus: "focus-visible:ring-cyan-400/60",
  },
  gold: {
    stroke: "#facc15",
    inner: "rgba(250,204,21,0.42)",
    glow: "rgba(250,204,21,0.5)",
    halo: "rgba(250,204,21,0.26)",
    text: "text-amber-200",
    ringFocus: "focus-visible:ring-amber-400/60",
  },
};

type HexBadgeProps = {
  accent: Accent;
  topLabel: string;
  primary: ReactNode;
  secondary?: string;
  size?: number;
  onClick?: () => void;
  active?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
};

/**
 * Clickable hex stamp — companion to `<HexAvatar />`. Pulses on hover, lights
 * up when its popover is open. Same SVG geometry as the avatar so they tile
 * edge-to-edge inside a `<HexCluster />`.
 */
export function HexBadge({
  accent,
  topLabel,
  primary,
  secondary,
  size = 104,
  onClick,
  active = false,
  ariaExpanded,
  ariaControls,
}: HexBadgeProps) {
  const tokens = ACCENT[accent];

  const w = size;
  const h = Math.round(size * 1.08);
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 4;

  const hexPath = buildHexPath(cx, cy, r);
  const innerHexPath = buildHexPath(cx, cy, r - 6);
  const gradId = `hex-grad-${accent}`;
  const haloId = `hex-halo-${accent}`;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      className={`group relative inline-block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${tokens.ringFocus}`}
      style={{ width: w, height: h }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      animate={{
        filter: active
          ? `drop-shadow(0 0 22px ${tokens.glow})`
          : `drop-shadow(0 0 9px ${tokens.halo})`,
      }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        aria-hidden
        className="block"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tokens.stroke} />
            <stop offset="60%" stopColor={tokens.stroke} stopOpacity="0.85" />
            <stop offset="100%" stopColor="rgba(244,232,212,0.45)" />
          </linearGradient>
          <radialGradient id={haloId} cx="50%" cy="42%" r="68%">
            <stop offset="0%" stopColor={tokens.inner} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        <path d={hexPath} fill={`url(#${haloId})`} opacity={0.6} />
        <path
          d={hexPath}
          fill="#04070a"
          stroke={`url(#${gradId})`}
          strokeWidth={1.35}
        />
        <path
          d={innerHexPath}
          fill="none"
          stroke="rgba(244,232,212,0.13)"
          strokeWidth={0.85}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className="font-[family-name:var(--font-geist-mono)] text-[8.5px] font-semibold uppercase tracking-[0.34em] text-zinc-500">
          {topLabel}
        </span>
        <span
          className={`mt-0.5 font-[family-name:var(--font-geist-mono)] text-[17px] font-bold tabular-nums ${tokens.text}`}
          style={{ textShadow: `0 0 12px ${tokens.glow}` }}
        >
          {primary}
        </span>
        {secondary ? (
          <span className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[8.5px] uppercase tracking-[0.24em] text-zinc-500">
            {secondary}
          </span>
        ) : null}
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${tokens.inner}, transparent 62%)`,
          mixBlendMode: "screen",
        }}
      />
    </motion.button>
  );
}

function buildHexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (Math.PI / 3) * i;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return pts.join(" ") + " Z";
}
