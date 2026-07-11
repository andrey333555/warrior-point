/**
 * Стартовая калибровка бойца Round 23.
 * Уровень + рекорд → стартовый ELO · диапазоны цен · бейдж «подтверждённый боец».
 */

export type SkillTier = "novice" | "amateur" | "pro";

export type FightRecord = {
  wins: number;
  losses: number;
  draws: number;
};

export type WarriorCalibration = {
  skillTier: SkillTier;
  record: FightRecord;
  startingElo: number;
  verifiedFighter: boolean;
  calibratedAt: string;
};

export type SkillTierMeta = {
  id: SkillTier;
  label: string;
  emoji: string;
  baseElo: number;
  hint: string;
};

export type PriceRange = {
  min: number;
  max: number;
  avg: number;
  label: string;
};

export const SKILL_TIERS: SkillTierMeta[] = [
  {
    id: "novice",
    label: "Новичок",
    emoji: "🌱",
    baseElo: 1200,
    hint: "Первые шаги в зале",
  },
  {
    id: "amateur",
    label: "Любитель",
    emoji: "💪",
    baseElo: 1500,
    hint: "Регулярные тренировки и любительские бои",
  },
  {
    id: "pro",
    label: "Профи",
    emoji: "⚡",
    baseElo: 1780,
    hint: "Профессиональный рекорд и соревнования",
  },
];

export const TRAINING_PRICE_RANGES: Record<SkillTier, PriceRange> = {
  novice: { min: 800, max: 1_500, avg: 1_150, label: "Новичок" },
  amateur: { min: 1_500, max: 3_000, avg: 2_250, label: "Любитель" },
  pro: { min: 3_000, max: 6_000, avg: 4_500, label: "Профи" },
};

export function getSkillTierMeta(tier: SkillTier): SkillTierMeta {
  return SKILL_TIERS.find((t) => t.id === tier) ?? SKILL_TIERS[0]!;
}

export function parseRecordInput(raw: string): FightRecord | null {
  const trimmed = raw.trim();
  if (!trimmed) return { wins: 0, losses: 0, draws: 0 };

  const parts = trimmed.split(/[-/]/).map((p) => Number.parseInt(p.trim(), 10));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;

  if (parts.length === 1) return { wins: parts[0]!, losses: 0, draws: 0 };
  if (parts.length === 2) return { wins: parts[0]!, losses: parts[1]!, draws: 0 };
  return { wins: parts[0]!, losses: parts[1]!, draws: parts[2]! };
}

export function formatRecord(record: FightRecord): string {
  if (record.draws > 0) {
    return `${record.wins}-${record.losses}-${record.draws}`;
  }
  return `${record.wins}-${record.losses}`;
}

export function calculateStartingElo(tier: SkillTier, record: FightRecord): number {
  const base = getSkillTierMeta(tier).baseElo;
  const recordBonus = Math.min(
    80,
    Math.max(-40, record.wins * 6 - record.losses * 4 + record.draws * 2),
  );
  return Math.min(2_200, Math.max(1_000, base + recordBonus));
}

export function buildCalibration(
  skillTier: SkillTier,
  record: FightRecord,
): WarriorCalibration {
  return {
    skillTier,
    record,
    startingElo: calculateStartingElo(skillTier, record),
    verifiedFighter: true,
    calibratedAt: new Date().toISOString(),
  };
}

export function formatPriceRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")}₽`;
}

export function priceHintForTier(tier: SkillTier): string {
  const range = TRAINING_PRICE_RANGES[tier];
  return `Средняя цена по уровню (${range.label}): ${formatPriceRub(range.avg)}`;
}

export function priceRangeLabel(tier: SkillTier): string {
  const range = TRAINING_PRICE_RANGES[tier];
  return `${formatPriceRub(range.min)} – ${formatPriceRub(range.max)}`;
}
