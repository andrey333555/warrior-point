"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

type HexAvatarProps = {
  initials: string;
  level: number;
  maxLevel?: number;
  size?: number;
  pulse?: boolean;
  /** Show the tiny pink tier badge in the corner — disable when used inside a HexCluster. */
  showTierBadge?: boolean;
};

/**
 * Hexagonal portrait stamp with neon ring + tier badge.
 * Pure SVG — scales crisply, animates via Framer Motion layout / pulse.
 */
export function HexAvatar({
  initials,
  level,
  maxLevel = 23,
  size = 132,
  pulse = false,
  showTierBadge = true,
}: HexAvatarProps) {
  const w = size;
  const h = Math.round(size * 1.08);

  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 4;

  const hexPath = buildHexPath(cx, cy, r);
  const innerHexPath = buildHexPath(cx, cy, r - 9);

  return (
    <div
      className="relative inline-block"
      style={{ width: w, height: h } as CSSProperties}
    >
      <motion.svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        aria-label={`Hex avatar · level ${level} of ${maxLevel}`}
        animate={
          pulse
            ? { filter: ["drop-shadow(0 0 14px rgba(34,211,238,0.45))", "drop-shadow(0 0 26px rgba(34,211,238,0.85))", "drop-shadow(0 0 14px rgba(34,211,238,0.45))"] }
            : { filter: "drop-shadow(0 0 14px rgba(34,211,238,0.45))" }
        }
        transition={pulse ? { duration: 2.2, repeat: Infinity } : { duration: 0.4 }}
      >
        <defs>
          <linearGradient id="hex-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
          <linearGradient id="hex-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b0f13" />
            <stop offset="100%" stopColor="#04070a" />
          </linearGradient>
          <radialGradient id="hex-glow" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
        </defs>

        <path d={hexPath} fill="url(#hex-glow)" />
        <path
          d={hexPath}
          fill="url(#hex-fill)"
          stroke="url(#hex-stroke)"
          strokeWidth={2}
        />
        <path
          d={innerHexPath}
          fill="none"
          stroke="rgba(244,232,212,0.18)"
          strokeWidth={1}
        />

        {/* corner ticks */}
        {buildCornerTicks(cx, cy, r).map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="#22d3ee"
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}

        <text
          x={cx}
          y={cy + 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#f4f4f5"
          fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          fontWeight={700}
          fontSize={Math.round(size * 0.32)}
          style={{
            textShadow: "0 0 22px rgba(34,211,238,0.55)",
            letterSpacing: "0.04em",
          }}
        >
          {initials}
        </text>
      </motion.svg>

      {showTierBadge ? (
        <div
          className="absolute -bottom-1 -right-1 flex items-center justify-center"
          style={{
            width: Math.round(size * 0.34),
            height: Math.round(size * 0.34),
          }}
          aria-hidden
        >
          <svg
            viewBox="0 0 40 40"
            width="100%"
            height="100%"
            style={{ filter: "drop-shadow(0 0 10px rgba(217,70,239,0.55))" }}
          >
            <path
              d={buildHexPath(20, 20, 18)}
              fill="#0a0a0a"
              stroke="#e879f9"
              strokeWidth={1.6}
            />
          </svg>
          <span className="absolute font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.05em] text-fuchsia-200">
            {String(level).padStart(2, "0")}
          </span>
        </div>
      ) : null}
    </div>
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

function buildCornerTicks(
  cx: number,
  cy: number,
  r: number,
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const ticks: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const inner = r - 5;
  const outer = r - 14;

  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (Math.PI / 3) * i;

    ticks.push({
      x1: cx + inner * Math.cos(angle),
      y1: cy + inner * Math.sin(angle),
      x2: cx + outer * Math.cos(angle),
      y2: cy + outer * Math.sin(angle),
    });
  }

  return ticks;
}
