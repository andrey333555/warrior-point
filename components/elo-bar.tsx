"use client";

import { motion } from "framer-motion";

type EloBarProps = {
  elo: number;
  delta30d: number;
  globalPct: number;
  /** Calibration range for the meter (visual only). */
  range?: { min: number; max: number };
};

export function EloBar({
  elo,
  delta30d,
  globalPct,
  range = { min: 800, max: 2400 },
}: EloBarProps) {
  const clamped = Math.max(range.min, Math.min(range.max, elo));
  const pct = ((clamped - range.min) / (range.max - range.min)) * 100;
  const positive = delta30d >= 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950/80 p-5 backdrop-blur-md sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl motion-safe:animate-pulse motion-safe:[animation-delay:750ms]" />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            Global ELO
          </p>
          <p
            className="mt-2 font-[family-name:var(--font-geist-mono)] text-5xl font-semibold tabular-nums tracking-tight text-white sm:text-6xl"
            style={{ textShadow: "0 0 38px rgba(34,211,238,0.35)" }}
          >
            {elo}
          </p>
          <p
            className={`mt-2 flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums ${
              positive ? "text-emerald-400" : "text-amber-300"
            }`}
          >
            <span className="motion-safe:animate-pulse">
              {positive ? "↑" : "↓"}
            </span>
            {positive ? "+" : ""}
            {delta30d} last 30 days
          </p>
        </div>

        <div className="rounded-xl border border-cyan-400/30 bg-black/45 px-4 py-3 text-right">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            Worldwide standing
          </p>
          <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-2xl text-cyan-200">
            Top {globalPct}%
          </p>
          <p className="mt-1 text-xs text-zinc-500">live leaderboard pool</p>
        </div>
      </div>

      <div className="relative mt-7">
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          <span>{range.min}</span>
          <span className="text-cyan-300/95">{elo}</span>
          <span>{range.max}</span>
        </div>

        <div className="relative mt-2 h-2 rounded-full bg-zinc-900">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-fuchsia-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 26 }}
            style={{ boxShadow: "0 0 20px rgba(34,211,238,0.45)" }}
          />
          <motion.div
            className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border border-cyan-200 bg-cyan-300"
            initial={false}
            animate={{ left: `${pct}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 26 }}
            style={{ boxShadow: "0 0 18px rgba(34,211,238,0.85)" }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          <span>Apprentice</span>
          <span>Contender</span>
          <span>Grandmaster</span>
        </div>
      </div>
    </section>
  );
}
