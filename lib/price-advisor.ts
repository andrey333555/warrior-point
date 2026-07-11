import {
  TRAINING_PRICE_RANGES,
  formatPriceRub,
  getSkillTierMeta,
  type SkillTier,
} from "@/lib/calibration";
import type { Gym } from "@/lib/network";

export type HubTier = "standard" | "major" | "elite";

export type PriceSuggestion = {
  tier: SkillTier;
  hubTier: HubTier;
  hubLabel: string;
  cityLabel: string;
  min: number;
  max: number;
  avg: number;
};

export type PriceVerdict = "fair" | "below" | "premium";

export type PriceComparison = {
  verdict: PriceVerdict;
  message: string;
};

const HUB_MULTIPLIER: Record<HubTier, number> = {
  standard: 1,
  major: 1.1,
  elite: 1.25,
};

const HUB_LABEL: Record<HubTier, string> = {
  standard: "стандартный хаб",
  major: "крупный хаб",
  elite: "elite-хаб",
};

function roundPrice(n: number): number {
  return Math.round(n / 50) * 50;
}

export function getHubTier(gym: Gym): HubTier {
  const hint = `${gym.note ?? ""} ${gym.name} ${gym.address}`.toLowerCase();
  if (
    hint.includes("elite") ||
    hint.includes("round 23") ||
    hint.includes("top tier") ||
    hint.includes("hq")
  ) {
    return "elite";
  }
  if (
    hint.includes("flagship") ||
    hint.includes("pro") ||
    hint.includes("verified partner")
  ) {
    return "major";
  }
  return "standard";
}

export function suggestTrainingPrice(
  tier: SkillTier,
  gym: Gym,
): PriceSuggestion {
  const base = TRAINING_PRICE_RANGES[tier];
  const hubTier = getHubTier(gym);
  const mult = HUB_MULTIPLIER[hubTier];

  return {
    tier,
    hubTier,
    hubLabel: HUB_LABEL[hubTier],
    cityLabel: gym.city,
    min: roundPrice(base.min * mult),
    max: roundPrice(base.max * mult),
    avg: roundPrice(base.avg * mult),
  };
}

export function compareTrainerPrice(
  trainerPrice: number,
  suggestion: PriceSuggestion,
): PriceComparison {
  const { min, max, avg } = suggestion;

  if (trainerPrice >= min && trainerPrice <= max) {
    return {
      verdict: "fair",
      message: `Цена тренера ${formatPriceRub(trainerPrice)} — в рынке для твоего уровня`,
    };
  }

  if (trainerPrice < min) {
    const gap = min - trainerPrice;
    if (gap <= avg * 0.15) {
      return {
        verdict: "fair",
        message: `Цена тренера ${formatPriceRub(trainerPrice)} — выгодное предложение`,
      };
    }
    return {
      verdict: "below",
      message: `Цена тренера ${formatPriceRub(trainerPrice)} — ниже рынка для твоего уровня в этом хабе`,
    };
  }

  if (trainerPrice <= max * 1.15) {
    return {
      verdict: "premium",
      message: `Цена тренера ${formatPriceRub(trainerPrice)} — премиум, оправдано уровнем коуча`,
    };
  }

  return {
    verdict: "premium",
    message: `Цена тренера ${formatPriceRub(trainerPrice)} — выше типичного диапазона для хаба`,
  };
}

export function aiPriceSummary(suggestion: PriceSuggestion): string {
  const meta = getSkillTierMeta(suggestion.tier);
  return `${meta.label} · ${suggestion.cityLabel} · ${suggestion.hubLabel}`;
}

export function aiPriceRangeLabel(suggestion: PriceSuggestion): string {
  return `${formatPriceRub(suggestion.min)} – ${formatPriceRub(suggestion.max)} · типично ${formatPriceRub(suggestion.avg)}`;
}
