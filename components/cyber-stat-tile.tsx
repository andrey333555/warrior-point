"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Accent = "cyan" | "fuchsia" | "amber";

const ACCENT_TOKENS: Record<
  Accent,
  {
    text: string;
    border: string;
    glowHex: string;
    surge: string;
  }
> = {
  cyan: {
    text: "text-cyan-200",
    border: "border-cyan-400/35",
    glowHex: "rgba(34,211,238,0.55)",
    surge: "from-cyan-500/[0.18] via-cyan-400/[0.08] to-transparent",
  },
  fuchsia: {
    text: "text-fuchsia-200",
    border: "border-fuchsia-400/35",
    glowHex: "rgba(217,70,239,0.55)",
    surge: "from-fuchsia-500/[0.2] via-fuchsia-400/[0.08] to-transparent",
  },
  amber: {
    text: "text-amber-200",
    border: "border-amber-400/35",
    glowHex: "rgba(245,158,11,0.55)",
    surge: "from-amber-500/[0.2] via-amber-400/[0.08] to-transparent",
  },
};

export type CyberStatTileProps = {
  label: string;
  value: number;
  /** Render the animated number (e.g. money format vs plain integer). */
  format?: (display: number) => string;
  hint?: string;
  accent?: Accent;
  /** Symbol/marker in the corner (kept tiny, no emoji). */
  glyph?: ReactNode;
  /** Action when the tile is tapped — toggling selection is handled outside. */
  onActivate?: () => void;
  active?: boolean;
};

export function CyberStatTile({
  label,
  value,
  format,
  hint,
  accent = "cyan",
  glyph,
  onActivate,
  active = false,
}: CyberStatTileProps) {
  const tokens = ACCENT_TOKENS[accent];

  const motionVal = useMotionValue(value);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(value);

  const prevValueRef = useRef(value);
  const [surgeStamp, setSurgeStamp] = useState(0);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => setDisplay(v));

    return unsub;
  }, [rounded]);

  useEffect(() => {
    const prev = prevValueRef.current;

    if (prev === value) return;

    prevValueRef.current = value;

    const controls = animate(motionVal, value, {
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    });

    setSurgeStamp((t) => t + 1);

    return () => controls.stop();
  }, [value, motionVal]);

  const rendered = format ? format(display) : display.toLocaleString("ru-RU");

  return (
    <motion.button
      type="button"
      onClick={onActivate}
      aria-pressed={active}
      whileHover={{
        scale: 1.015,
        boxShadow: `0 0 38px -10px ${tokens.glowHex}`,
      }}
      whileTap={{ scale: 0.985 }}
      animate={{
        boxShadow: active
          ? `0 0 44px -10px ${tokens.glowHex}`
          : "0 0 0px -10px rgba(0,0,0,0)",
      }}
      className={`group relative isolate flex h-full flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl border ${
        active
          ? tokens.border + " bg-zinc-950/85"
          : "border-white/[0.08] bg-zinc-950/65"
      } px-4 py-4 text-left transition-colors sm:px-5 sm:py-5`}
    >
      {/* Surge wash on value change */}
      <AnimatePresence>
        <motion.div
          key={surgeStamp}
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tokens.surge}`}
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.95, ease: "easeOut" }}
        />
      </AnimatePresence>

      <div className="relative flex w-full items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-zinc-500 sm:text-[11px]">
          {label}
        </p>
        {glyph ? (
          <span
            className={`shrink-0 rounded-md border ${tokens.border} bg-black/55 px-1.5 py-1 ${tokens.text}`}
          >
            {glyph}
          </span>
        ) : null}
      </div>

      <div className="relative w-full">
        <p
          className={`font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums tracking-tight ${tokens.text} sm:text-[28px]`}
          style={{ textShadow: `0 0 22px ${tokens.glowHex}` }}
        >
          {rendered}
        </p>
        {hint ? (
          <p className="mt-1.5 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
            {hint}
          </p>
        ) : null}
      </div>

      <div className="relative h-px w-full overflow-hidden bg-white/[0.05]">
        <motion.span
          key={`bar-${surgeStamp}`}
          aria-hidden
          className={`absolute inset-y-0 left-0 ${
            accent === "cyan"
              ? "bg-cyan-300"
              : accent === "fuchsia"
              ? "bg-fuchsia-300"
              : "bg-amber-300"
          }`}
          initial={{ x: "-100%", width: "100%", opacity: 0.95 }}
          animate={{ x: "100%", opacity: 0 }}
          transition={{ duration: 1.05, ease: "easeOut" }}
        />
      </div>
    </motion.button>
  );
}
