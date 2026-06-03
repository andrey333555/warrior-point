"use client";

/**
 * DailyStreak — Dopamine Machine component
 *
 * Tracks consecutive training days. Fires anti-churn triggers:
 *   - "Session Missing" alert when streak is at risk (>20h since last session)
 *   - "First Strike" achievement badge on first-ever session
 *
 * Visual: a row of neon day-dots + streak count + achievement pill.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

type DailyStreakProps = {
  streak: number;
  lastSessionAt: Date | null;
  firstStrikeEarned: boolean;
  /** Show in compact single-line mode (for passport hero). */
  compact?: boolean;
};

function msToHours(ms: number) {
  return ms / 1000 / 3600;
}

function streakStatus(streak: number, lastSessionAt: Date | null) {
  if (!lastSessionAt) return "idle" as const;

  const hoursSince = msToHours(Date.now() - lastSessionAt.getTime());

  if (hoursSince > 30) return "session_missing" as const; // anti-churn trigger
  if (hoursSince > 20) return "at_risk" as const;
  return "active" as const;
}

const STATUS_COLORS = {
  idle:            { dot: "#71717a",  text: "text-zinc-500",    border: "border-zinc-700/50", bg: "bg-zinc-900/40" },
  active:          { dot: "#22d3ee",  text: "text-cyan-300",    border: "border-cyan-400/40", bg: "bg-cyan-500/[0.07]" },
  at_risk:         { dot: "#facc15",  text: "text-amber-300",   border: "border-amber-400/40", bg: "bg-amber-500/[0.07]" },
  session_missing: { dot: "#f87171",  text: "text-rose-300",    border: "border-rose-400/40", bg: "bg-rose-500/[0.07]" },
} as const;

const STATUS_LABEL = {
  idle:            "Начни тренировку",
  active:          "Серия активна",
  at_risk:         "Серия под угрозой",
  session_missing: "Session Missing — прервёт серию",
} as const;

/** Up to 7 day-dots showing the recent streak window. */
function StreakDots({ streak, status }: { streak: number; status: keyof typeof STATUS_COLORS }) {
  const dots = Array.from({ length: 7 }, (_, i) => i < streak);
  const hexColor = STATUS_COLORS[status].dot;

  return (
    <div className="flex items-center gap-[5px]">
      {dots.map((filled, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 22 }}
          className="h-[7px] w-[7px] rounded-full"
          style={{
            background: filled ? hexColor : "#27272a",
            boxShadow: filled ? `0 0 6px 1px ${hexColor}80` : "none",
          }}
        />
      ))}
      {streak > 7 && (
        <span className="ml-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.2em] text-zinc-500">
          +{streak - 7}
        </span>
      )}
    </div>
  );
}

export function DailyStreak({
  streak,
  lastSessionAt,
  firstStrikeEarned,
  compact = false,
}: DailyStreakProps) {
  const status = useMemo(
    () => streakStatus(streak, lastSessionAt),
    [streak, lastSessionAt],
  );

  const colors = STATUS_COLORS[status];
  const isMissing = status === "session_missing";
  const isAtRisk = status === "at_risk";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StreakDots streak={Math.min(streak, 7)} status={status} />
        <span
          className={[
            "font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.24em]",
            colors.text,
          ].join(" ")}
        >
          {streak > 0 ? `×${streak}` : "—"}
        </span>
        {firstStrikeEarned && (
          <span
            className="rounded-full border border-amber-400/40 bg-amber-500/[0.1] px-1.5 py-[1px] font-[family-name:var(--font-geist-mono)] text-[7.5px] font-bold uppercase tracking-[0.2em] text-amber-300"
            style={{ boxShadow: "0 0 8px -2px rgba(250,204,21,0.5)" }}
          >
            ⚡ First Strike
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3",
        colors.border,
        colors.bg,
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Daily Streak
          </span>
          {firstStrikeEarned && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 20 }}
              className="rounded-full border border-amber-400/50 bg-amber-500/[0.12] px-2 py-[1.5px] font-[family-name:var(--font-geist-mono)] text-[8px] font-bold uppercase tracking-[0.2em] text-amber-200"
              style={{ boxShadow: "0 0 12px -4px rgba(250,204,21,0.6)" }}
            >
              ⚡ First Strike
            </motion.span>
          )}
        </div>
        <span
          className={[
            "font-[family-name:var(--font-geist-mono)] text-xl font-bold tabular-nums",
            colors.text,
          ].join(" ")}
        >
          {streak}
          <span className="ml-1 text-xs font-normal opacity-60">дней</span>
        </span>
      </div>

      {/* Dots */}
      <div className="mt-2.5">
        <StreakDots streak={Math.min(streak, 7)} status={status} />
      </div>

      {/* Anti-churn status line */}
      <AnimatePresence>
        {(isMissing || isAtRisk) && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className={[
              "font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.2em]",
              isMissing ? "text-rose-400" : "text-amber-400",
            ].join(" ")}
          >
            {isMissing ? "⚠ Session Missing" : "⏱ " + STATUS_LABEL[status]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
