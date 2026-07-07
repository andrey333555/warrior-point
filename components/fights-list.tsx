"use client";

/**
 * FightsList — compact animated bout ledger for an active league card.
 */

import { motion } from "framer-motion";
import type { LeagueFight } from "@/lib/mocks/league-fights";

const OUTCOME_STYLE: Record<
  LeagueFight["outcome"],
  { border: string; bg: string; text: string }
> = {
  WIN: {
    border: "border-emerald-400/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
  },
  LOSS: {
    border: "border-rose-400/35",
    bg: "bg-rose-500/10",
    text: "text-rose-300",
  },
  DRAW: {
    border: "border-neutral-500/35",
    bg: "bg-neutral-500/10",
    text: "text-neutral-300",
  },
};

export function FightsList({
  fights,
  accent = "#22d3ee",
}: {
  fights: readonly LeagueFight[];
  accent?: string;
}) {
  if (!fights.length) {
    return (
      <p className="py-2 text-center font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.16em] text-neutral-600">
        Нет боёв в реестре
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 overflow-hidden">
      {fights.map((f, i) => {
        const st = OUTCOME_STYLE[f.outcome];
        return (
          <motion.li
            key={f.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="grid grid-cols-[3.2rem_minmax(0,1fr)_2.2rem_2.2rem] items-center gap-2 rounded-lg border border-white/[0.06] bg-black/50 px-2 py-1.5"
            style={{ boxShadow: `0 0 16px -12px ${accent}` }}
          >
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[7.5px] tabular-nums text-neutral-500">
              {f.date.slice(2).replace(/-/g, ".")}
            </span>
            <span className="truncate font-[family-name:var(--font-geist-sans)] text-[10px] font-medium text-neutral-200">
              {f.opponent}
            </span>
            <span
              className={`rounded border px-1 py-0.5 text-center font-[family-name:var(--font-jetbrains-mono)] text-[7px] font-bold ${st.border} ${st.bg} ${st.text}`}
            >
              {f.outcome}
            </span>
            <span className="text-right font-[family-name:var(--font-jetbrains-mono)] text-[8px] font-semibold text-neutral-400">
              {f.method}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
