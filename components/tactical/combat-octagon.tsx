"use client";

/**
 * CombatOctagon — the centrepiece of the Tactical Fighter OS passport.
 *
 * A large neon octagon with a layered glow, corner ticks and a scanning ring.
 * The COMBAT SCORE and level ladder are rendered as crisp HTML text overlaid
 * dead-centre (sharper than SVG <text> for custom fonts).
 */

import { motion } from "framer-motion";
import { MetatronsCube, type MetatronRole } from "@/components/metatrons-cube";

type CombatOctagonProps = {
  /** 0–100 combat score, one decimal shown. */
  score: number;
  level: number;
  maxLevel: number;
  /** Neon accent hex. */
  accent?: string;
  /** Gold winner ring overlay. */
  isWinner?: boolean;
  /** Tailwind width utility for the square wrapper. */
  widthClass?: string;
  /** Custom centre content. When provided, replaces the default score readout. */
  center?: React.ReactNode;
  /** Metatron's Cube cycle instead of text tabs (fighter mode). */
  showPlaylist?: boolean;
  /** Role palette for Metatron geometry. */
  metatronRole?: MetatronRole;
  videoSrc?: string;
  posterInitials?: string;
};

// Octagon in a 200×200 viewBox (30% / 70% cut-points).
const PTS = "60,2 140,2 198,60 198,140 140,198 60,198 2,140 2,60";
const PTS_INNER = "60,14 140,14 186,60 186,140 140,186 60,186 14,140 14,60";

export function CombatOctagon({
  score,
  level,
  maxLevel,
  accent = "#00F0FF",
  isWinner = false,
  widthClass = "w-[min(52vw,300px)]",
  center,
  showPlaylist = false,
  metatronRole = "fighter",
  videoSrc,
  posterInitials = "ББ",
}: CombatOctagonProps) {
  const ring = isWinner ? "#facc15" : accent;
  const pct = Math.max(0, Math.min(1, level / maxLevel));

  return (
    <div className={`relative aspect-square select-none ${widthClass}`}>
      {/* Ambient glow puff behind the cage */}
      <div
        aria-hidden
        className="absolute inset-[12%] rounded-full blur-2xl"
        style={{ background: ring, opacity: 0.16 }}
      />

      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id="oct-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ring} stopOpacity="0.10" />
            <stop offset="100%" stopColor={ring} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Outer cage */}
        <polygon
          points={PTS}
          fill="url(#oct-fill)"
          stroke={ring}
          strokeWidth="1.5"
          style={{ filter: `drop-shadow(0 0 10px ${ring}aa)` }}
        />

        {/* Inner cage line */}
        <polygon
          points={PTS_INNER}
          fill="none"
          stroke={ring}
          strokeWidth="0.6"
          opacity="0.4"
        />

        {/* Cross-hair guides */}
        <line x1="100" y1="20" x2="100" y2="48" stroke={ring} strokeWidth="0.6" opacity="0.35" />
        <line x1="100" y1="152" x2="100" y2="180" stroke={ring} strokeWidth="0.6" opacity="0.35" />

        {/* Rotating scan ring */}
        <motion.circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke={ring}
          strokeWidth="0.8"
          strokeDasharray="6 14"
          opacity="0.45"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "100px 100px" }}
        />

        {/* Level progress arc — top edge fills with level pct */}
        <polyline
          points={`60,2 ${60 + 80 * pct},2`}
          fill="none"
          stroke={ring}
          strokeWidth="3"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${ring})` }}
        />
      </svg>

      {/* Centre readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        {center ? (
          center
        ) : showPlaylist ? (
          <MetatronsCube
            role={metatronRole}
            combatScore={score}
            size={Math.min(200, 220)}
            className="max-h-[88%] max-w-[88%]"
            videoSrc={videoSrc}
            posterInitials={posterInitials}
          />
        ) : (
          <>
            <span
              className="font-[family-name:var(--font-geist-mono)] text-[8px] font-semibold uppercase tracking-[0.42em]"
              style={{ color: ring }}
            >
              Combat Score
            </span>
            <motion.span
              key={score}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="font-[family-name:var(--font-jetbrains-mono)] text-[clamp(1.8rem,8vw,2.6rem)] font-extrabold leading-none tracking-tight text-white"
              style={{ textShadow: `0 0 24px ${ring}80` }}
            >
              {score.toFixed(1)}
            </motion.span>
            <span
              className="mt-1 rounded-full border px-3 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ borderColor: `${ring}55`, color: ring, background: `${ring}10` }}
            >
              LVL {level} / {maxLevel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
