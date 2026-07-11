"use client";

import { useMemo } from "react";
import type { Gym } from "@/lib/network";
import { getCalibration } from "@/lib/calibration-store";
import type { SkillTier } from "@/lib/calibration";
import {
  aiPriceRangeLabel,
  aiPriceSummary,
  compareTrainerPrice,
  suggestTrainingPrice,
} from "@/lib/price-advisor";

type AiPriceAdvisorProps = {
  fighterId?: string;
  tier?: SkillTier;
  gym?: Gym;
  trainerPrice?: number;
};

export default function AiPriceAdvisor({
  fighterId,
  tier,
  gym,
  trainerPrice,
}: AiPriceAdvisorProps) {
  const resolvedTier =
    tier ?? (fighterId ? getCalibration(fighterId)?.skillTier : undefined) ?? "amateur";

  const suggestion = useMemo(() => {
    if (!gym) return null;
    return suggestTrainingPrice(resolvedTier, gym);
  }, [resolvedTier, gym]);

  const comparison = useMemo(() => {
    if (!suggestion || trainerPrice == null) return null;
    return compareTrainerPrice(trainerPrice, suggestion);
  }, [suggestion, trainerPrice]);

  if (!suggestion) return null;

  const verdictColor =
    comparison?.verdict === "fair"
      ? "text-emerald-400/90"
      : comparison?.verdict === "below"
        ? "text-sky-400/90"
        : "text-amber-400/90";

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3">
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-violet-300/80">
        🤖 AI · ориентир цены
      </p>
      <p className="mt-1.5 text-sm text-white/90">{aiPriceSummary(suggestion)}</p>
      <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-xs tabular-nums text-zinc-400">
        {aiPriceRangeLabel(suggestion)}
      </p>
      {comparison ? (
        <p className={`mt-2 text-xs ${verdictColor}`}>{comparison.message}</p>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">
          Ориентир для твоего уровня — не заменяет цену тренера
        </p>
      )}
    </div>
  );
}
