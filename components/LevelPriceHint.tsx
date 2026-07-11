"use client";

import {
  SKILL_TIERS,
  TRAINING_PRICE_RANGES,
  getSkillTierMeta,
  priceHintForTier,
  priceRangeLabel,
  formatPriceRub,
  type SkillTier,
} from "@/lib/calibration";
import { getCalibration } from "@/lib/calibration-store";

type LevelPriceHintProps = {
  fighterId?: string;
  tier?: SkillTier;
  compact?: boolean;
  showAllRanges?: boolean;
};

export default function LevelPriceHint({
  fighterId,
  tier,
  compact = false,
  showAllRanges = true,
}: LevelPriceHintProps) {
  const resolvedTier =
    tier ?? (fighterId ? getCalibration(fighterId)?.skillTier : undefined) ?? "amateur";

  const meta = getSkillTierMeta(resolvedTier);
  const range = TRAINING_PRICE_RANGES[resolvedTier];

  if (compact) {
    return (
      <p className="text-xs text-zinc-400">
        {priceHintForTier(resolvedTier)} · диапазон {priceRangeLabel(resolvedTier)}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/[0.05] px-4 py-3">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-[#C9A84C]/80">
          {meta.emoji} Уровень · {meta.label}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-white">
          {priceHintForTier(resolvedTier)}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Диапазон: {priceRangeLabel(resolvedTier)} · типично {formatPriceRub(range.avg)}
        </p>
      </div>

      {showAllRanges ? (
        <div className="grid grid-cols-3 gap-2">
          {SKILL_TIERS.map((t) => {
            const r = TRAINING_PRICE_RANGES[t.id];
            const active = t.id === resolvedTier;
            return (
              <div
                key={t.id}
                className={
                  active
                    ? "rounded-lg border border-[#C9A84C]/35 bg-[#C9A84C]/[0.08] px-2 py-2 text-center"
                    : "rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-center"
                }
              >
                <p className="text-[9px] font-semibold text-white/70">{t.label}</p>
                <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-zinc-400">
                  {formatPriceRub(r.min)}–{formatPriceRub(r.max)}
                </p>
                <p className="mt-0.5 text-[9px] text-zinc-500">ср. {formatPriceRub(r.avg)}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
