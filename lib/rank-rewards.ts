/** Codex of tier names + perks across the 23-level Warrior Point ladder. */

export type RankReward = Readonly<{
  name: string;
  perk: string;
  xpBonusPct: number;
}>;

const RANK_TABLE: Readonly<Record<number, RankReward>> = {
  1: { name: "Initiate", perk: "Cleared for sanctioned spar", xpBonusPct: 0 },
  3: {
    name: "Contender",
    perk: "Bonus: +1% XP to next session",
    xpBonusPct: 1,
  },
  5: {
    name: "Streetlamp",
    perk: "Bonus: +2% XP to next session",
    xpBonusPct: 2,
  },
  8: {
    name: "Sanctioned",
    perk: "Bonus: +3% XP to next session",
    xpBonusPct: 3,
  },
  12: {
    name: "Citadel",
    perk: "Bonus: +4% XP to next session",
    xpBonusPct: 4,
  },
  17: {
    name: "Unstoppable",
    perk: "Bonus: +5% XP to next session",
    xpBonusPct: 5,
  },
  20: {
    name: "Sovereign",
    perk: "Bonus: +7% XP · audited fast track",
    xpBonusPct: 7,
  },
  23: {
    name: "Grandmaster",
    perk: "Sovereign tier · cross-border audited",
    xpBonusPct: 10,
  },
};

/** Resolve the named tier closest at or below `level`. */
export function rankRewardFor(level: number): RankReward {
  const safe = Math.max(1, Math.floor(level));

  let bestKey = 1;

  for (const key of Object.keys(RANK_TABLE)) {
    const k = Number.parseInt(key, 10);

    if (k <= safe && k > bestKey) bestKey = k;
  }

  return RANK_TABLE[bestKey] ?? RANK_TABLE[1];
}
