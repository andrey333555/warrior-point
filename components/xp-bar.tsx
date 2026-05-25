"use client";

import { motion } from "framer-motion";

type XpBarProps = {
  level: number;
  maxLevel: number;
  totalXp: number;
  pctInLevel: number;
  xpForNext: number | null;
};

export function XpBar({
  level,
  maxLevel,
  totalXp,
  pctInLevel,
  xpForNext,
}: XpBarProps) {
  const globalPct = (level / maxLevel) * 100;
  const tierWidthPct = Math.max(2, Math.min(100, pctInLevel * 100));

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
          <span>XP arc · tier {level}</span>
          <span className="text-cyan-300/95">
            {xpForNext !== null
              ? `${Math.ceil(xpForNext)} XP до следующего гейта`
              : "Grandmaster orbit"}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-zinc-900">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-fuchsia-500"
            layout
            initial={false}
            animate={{ width: `${tierWidthPct}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            style={{ boxShadow: "0 0 26px rgba(34,211,238,0.5)" }}
          />
          <div
            className="absolute inset-0 opacity-20 mix-blend-screen"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0 11px, rgba(244,232,212,0.45) 11px 12px)",
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
          <span>Global progression echo</span>
          <span className="text-fuchsia-300/95">
            {level}/{maxLevel} · {totalXp.toLocaleString("ru-RU")} XP
          </span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-zinc-900">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500/65 via-cyan-300/60 to-fuchsia-500/70"
            initial={false}
            animate={{ width: `${Math.min(100, Math.max(globalPct, 2))}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          />
          {/* tier ticks */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: maxLevel + 1 }).map((_, i) => (
              <div
                key={i}
                className="h-full flex-1"
                style={{
                  borderRight:
                    i < maxLevel ? "1px solid rgba(244,232,212,0.07)" : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
