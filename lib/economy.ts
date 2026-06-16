/** Platform commission withheld from every sanctioned settlement (% of gross). */
export const PLATFORM_COMMISSION_PCT = 19 as const;

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

/** Warrior Point rank ladder length (Grandmaster tier at [`MAX_LEVEL`]). */
export const MAX_LEVEL = 23 as const;

export const MIN_LEVEL = 1 as const;

export type SettlementBreakdown = {
  gross: number;
  commissionPct: typeof PLATFORM_COMMISSION_PCT;
  commission: number;
  net: number;
};

/** Cumulative XP thresholds: index `level - 1` is the XP floor for that level (1‑based ladder). */
const LEVEL_START_XP: readonly number[] = buildLevelXpFloors();

function buildLevelXpFloors(): number[] {
  const floors: number[] = [0];
  let cumulative = 0;

  for (let fromTier = MIN_LEVEL; fromTier < MAX_LEVEL; fromTier++) {
    const step =
      100 +
      fromTier * 34 +
      fromTier ** 2 * 3 +
      Math.round(Math.sin(fromTier) * 18);
    cumulative += Math.max(step, 1);
    floors.push(cumulative);
  }

  return floors;
}

export function levelStartXp(level: number): number {
  if (!Number.isFinite(level)) return 0;

  const L = clampLevel(level);
  return LEVEL_START_XP[L - MIN_LEVEL];
}

export function deriveLevel(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));

  let level = MAX_LEVEL;

  while (level > MIN_LEVEL && xp < levelStartXp(level)) {
    level--;
  }

  return level;
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

  const level = deriveLevel(normalizedXp);

  const startHere = levelStartXp(level);

  const xpIntoLevel = normalizedXp - startHere;

  if (level >= MAX_LEVEL) {
    const spanSuggestion = Math.max(levelStartXp(MAX_LEVEL) / 23, 1);

    return {
      level,
      xpIntoLevel,
      xpForNext: null,
      pctInLevel: Math.min(xpIntoLevel / spanSuggestion, 1),
    };
  }

  const nextFloor = levelStartXp(level + 1);
  const span = Math.max(nextFloor - startHere, 1);

  return {
    level,
    xpIntoLevel,
    xpForNext: nextFloor - normalizedXp,
    pctInLevel: xpIntoLevel / span,
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

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(level)));
}
