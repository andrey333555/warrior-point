/** Platform commission withheld from every sanctioned settlement (% of gross). */
import {
  clampLevel,
  getRound,
  getRoundByXP,
  getRoundProgress,
  getXPToNext,
  MAX_LEVEL,
  MIN_LEVEL,
} from "@/lib/levels";

export { MAX_LEVEL, MIN_LEVEL } from "@/lib/levels";

export const PLATFORM_COMMISSION_PCT = 19 as const;

/** Donation tip commission (% of gross SBP transfer). */
export const DONATION_PLATFORM_FEE_PCT = 5 as const;

export function donateSettlement(gross: number) {
  const safe = Math.max(0, Math.round(gross));
  const platformFee = Math.round(safe * (DONATION_PLATFORM_FEE_PCT / 100));
  return { gross: safe, platformFee, net: safe - platformFee };
}

// ── Open Marketplace Tariff ────────────────────────────────────────────────────

/**
 * Result of the open-marketplace tariff calculation.
 *
 * Model:
 *   Trainer/Fighter sets their own `base_price`.
 *   Platform adds a 19% service fee on top → `total_price` is what the client pays.
 *   Trainer receives `net_coach_amount` = base_price in full.
 *   Platform keeps `commission` (insurance + infrastructure).
 */
export type MarketplaceTariff = {
  /** Price the trainer/fighter sets for their service. */
  basePrice: number;
  /** Platform commission: base_price × 0.19 (insurance + infrastructure). */
  commission: number;
  /** Commission rate, always 19. */
  commissionPct: typeof PLATFORM_COMMISSION_PCT;
  /** Client-facing total: base_price + commission. */
  totalPrice: number;
  /** Amount the trainer receives in full — equals base_price. */
  netCoachAmount: number;
};

/**
 * Calculate the open-marketplace tariff for a given base price.
 *
 * Example: base_price = 2 000 ₽
 *   commission      = 380 ₽  (19%)
 *   total_price     = 2 380 ₽ (client pays)
 *   net_coach_amount = 2 000 ₽ (trainer keeps everything)
 */
export function calculateTotalTariff(basePrice: number): MarketplaceTariff {
  const safe = Number.isFinite(basePrice) ? Math.max(0, basePrice) : 0;
  const commission = Math.round(safe * (PLATFORM_COMMISSION_PCT / 100));

  return {
    basePrice: safe,
    commission,
    commissionPct: PLATFORM_COMMISSION_PCT,
    totalPrice: safe + commission,
    netCoachAmount: safe,
  };
}

export type SettlementBreakdown = {
  gross: number;
  commissionPct: typeof PLATFORM_COMMISSION_PCT;
  commission: number;
  net: number;
};

export function levelStartXp(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return getRound(clampLevel(level)).xpRequired;
}

export function deriveLevel(totalXp: number): number {
  return getRoundByXP(totalXp).round;
}

export function splitSettlement(gross: number): SettlementBreakdown {
  const grossSafe = Number.isFinite(gross) ? Math.max(0, gross) : 0;
  const commission = Math.round((grossSafe * PLATFORM_COMMISSION_PCT) / 100);

  return {
    gross: grossSafe,
    commissionPct: PLATFORM_COMMISSION_PCT,
    commission,
    net: grossSafe - commission,
  };
}

export type TrainingSessionEconomyResult = {
  breakdown: SettlementBreakdown;
  xpAward: number;
};

/** Demo tariff: sanctioned training billed at 1 000 ₽ gross (pre-fee showcase). */
export const DEMO_SESSION_GROSS_RUB = 1000 as const;

const SESSION_XP_BASE = 110;

function experienceFromTrainingSessionNet(netRub: number): number {
  const net = Number.isFinite(netRub) ? Math.max(0, netRub) : 0;

  return SESSION_XP_BASE + Math.round(net / 25);
}

export function recordTrainingSessionRub(
  grossRub: number,
): TrainingSessionEconomyResult {
  const breakdown = splitSettlement(grossRub);
  const xpAward = experienceFromTrainingSessionNet(breakdown.net);

  return { breakdown, xpAward };
}

export function xpBracketProgress(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number | null;
  pctInLevel: number;
} {
  const normalizedXp = Math.max(0, totalXp);
  const current = getRoundByXP(normalizedXp);
  const xpIntoLevel = normalizedXp - current.xpRequired;
  const xpForNext = getXPToNext(normalizedXp);

  return {
    level: current.round,
    xpIntoLevel,
    xpForNext: current.round >= MAX_LEVEL ? null : xpForNext,
    pctInLevel: getRoundProgress(normalizedXp) / 100,
  };
}

export type FighterAdvancerResult = {
  totalXpAfter: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  levelsJumped: number;
};

export function advanceFighterXp(
  totalXpBefore: number,
  xpGain: number,
): FighterAdvancerResult {
  const safeGain = Number.isFinite(xpGain)
    ? Math.max(0, Math.floor(xpGain))
    : 0;

  const levelBefore = deriveLevel(totalXpBefore);
  const totalXpAfter = Math.max(0, Math.floor(totalXpBefore) + safeGain);
  const levelAfter = deriveLevel(totalXpAfter);
  const levelsJumped = levelAfter - levelBefore;

  return {
    totalXpAfter,
    levelBefore,
    levelAfter,
    leveledUp: levelsJumped > 0,
    levelsJumped,
  };
}
