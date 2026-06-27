// Система 23 раундов — Round 23

export const MAX_LEVEL = 23 as const;
export const MIN_LEVEL = 1 as const;

export type RoundTier = "Новичок" | "Боец" | "Ветеран" | "Элита" | "Легенда";

export type Round = {
  round: number;
  tier: RoundTier;
  label: string;
  xpRequired: number;
  xpToNext: number;
  color: string;
  glowColor: string;
  unlocksLabel: string;
};

const FIB = [
  0, 100, 100, 200, 300, 500, 800, 1300, 2100, 3400, 5500, 8900, 14400, 23300,
  37700, 61000, 98700, 159700, 258400, 418100, 676500, 1094600, 1771100, 2865700,
];

export const ROUNDS: Round[] = [
  { round: 1, tier: "Новичок", label: "Новобранец", xpRequired: 0, xpToNext: FIB[1]!, color: "#6b7280", glowColor: "rgba(107,114,128,0.3)", unlocksLabel: "Базовые залы · Тренеры уровня 1" },
  { round: 2, tier: "Новичок", label: "Ученик", xpRequired: FIB[1]!, xpToNext: FIB[2]!, color: "#6b7280", glowColor: "rgba(107,114,128,0.3)", unlocksLabel: "Групповые сплиты · Залы Кузня" },
  { round: 3, tier: "Новичок", label: "Спарринг-мен", xpRequired: FIB[2]!, xpToNext: FIB[3]!, color: "#6b7280", glowColor: "rgba(107,114,128,0.3)", unlocksLabel: "Видео-дневник · Базовый ELO" },
  { round: 4, tier: "Новичок", label: "Дебютант", xpRequired: FIB[3]!, xpToNext: FIB[4]!, color: "#6b7280", glowColor: "rgba(107,114,128,0.3)", unlocksLabel: "Рейтинговые бои · Лидерборд" },
  { round: 5, tier: "Новичок", label: "Претендент", xpRequired: FIB[4]!, xpToNext: FIB[5]!, color: "#6b7280", glowColor: "rgba(107,114,128,0.3)", unlocksLabel: "Тренеры уровня 2 · Борцовские залы" },
  { round: 6, tier: "Боец", label: "Боец", xpRequired: FIB[5]!, xpToNext: FIB[6]!, color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", unlocksLabel: "Тренеры среднего уровня · BJJ" },
  { round: 7, tier: "Боец", label: "Страйкер", xpRequired: FIB[6]!, xpToNext: FIB[7]!, color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", unlocksLabel: "Бойцовские залы · MMA сплиты" },
  { round: 8, tier: "Боец", label: "Грэпплер", xpRequired: FIB[7]!, xpToNext: FIB[8]!, color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", unlocksLabel: "Региональные турниры · ACA" },
  { round: 9, tier: "Боец", label: "Контендер", xpRequired: FIB[8]!, xpToNext: FIB[9]!, color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", unlocksLabel: "Персональные тренировки · Видео разборы" },
  { round: 10, tier: "Боец", label: "Ветеран ринга", xpRequired: FIB[9]!, xpToNext: FIB[10]!, color: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", unlocksLabel: "Тренеры высокого уровня · RCC" },
  { round: 11, tier: "Ветеран", label: "Ветеран", xpRequired: FIB[10]!, xpToNext: FIB[11]!, color: "#8b5cf6", glowColor: "rgba(139,92,246,0.3)", unlocksLabel: "Топ-тренеры · Закрытые сплиты" },
  { round: 12, tier: "Ветеран", label: "Чемпион зала", xpRequired: FIB[11]!, xpToNext: FIB[12]!, color: "#8b5cf6", glowColor: "rgba(139,92,246,0.3)", unlocksLabel: "Экстремальные тренировки · Fight Camp" },
  { round: 13, tier: "Ветеран", label: "Мастер", xpRequired: FIB[12]!, xpToNext: FIB[13]!, color: "#8b5cf6", glowColor: "rgba(139,92,246,0.3)", unlocksLabel: "Контракты Fight Nights · Медиа" },
  { round: 14, tier: "Ветеран", label: "Сенсей", xpRequired: FIB[13]!, xpToNext: FIB[14]!, color: "#8b5cf6", glowColor: "rgba(139,92,246,0.3)", unlocksLabel: "Сам стать тренером · Вести сплиты" },
  { round: 15, tier: "Ветеран", label: "Легион", xpRequired: FIB[14]!, xpToNext: FIB[15]!, color: "#8b5cf6", glowColor: "rgba(139,92,246,0.3)", unlocksLabel: "Элитные залы · UFC партнёры" },
  { round: 16, tier: "Элита", label: "Элита", xpRequired: FIB[15]!, xpToNext: FIB[16]!, color: "#C9A84C", glowColor: "rgba(201,168,76,0.4)", unlocksLabel: "Чемпионские тренеры · Закрытые лагеря" },
  { round: 17, tier: "Элита", label: "Про", xpRequired: FIB[16]!, xpToNext: FIB[17]!, color: "#C9A84C", glowColor: "rgba(201,168,76,0.4)", unlocksLabel: "UFC Fight Camp · Персональный менеджер" },
  { round: 18, tier: "Элита", label: "Чемпион", xpRequired: FIB[17]!, xpToNext: FIB[18]!, color: "#C9A84C", glowColor: "rgba(201,168,76,0.4)", unlocksLabel: "Контракт ACA/RCC · Прямые переговоры" },
  { round: 19, tier: "Элита", label: "Мировой", xpRequired: FIB[18]!, xpToNext: FIB[19]!, color: "#C9A84C", glowColor: "rgba(201,168,76,0.4)", unlocksLabel: "Международные турниры · Спонсоры" },
  { round: 20, tier: "Элита", label: "Абсолют", xpRequired: FIB[19]!, xpToNext: FIB[20]!, color: "#C9A84C", glowColor: "rgba(201,168,76,0.4)", unlocksLabel: "Легендарные тренеры · Эксклюзив" },
  { round: 21, tier: "Легенда", label: "Легенда", xpRequired: FIB[20]!, xpToNext: FIB[21]!, color: "#ef4444", glowColor: "rgba(239,68,68,0.4)", unlocksLabel: "UFC уровень · Все тренеры · Все залы" },
  { round: 22, tier: "Легенда", label: "Бессмертный", xpRequired: FIB[21]!, xpToNext: FIB[22]!, color: "#ef4444", glowColor: "rgba(239,68,68,0.4)", unlocksLabel: "Hall of Fame · Mentorship программа" },
  { round: 23, tier: "Легенда", label: "ROUND 23", xpRequired: FIB[22]!, xpToNext: 0, color: "#ef4444", glowColor: "rgba(239,68,68,0.5)", unlocksLabel: "🏆 Максимальный уровень · Всё открыто" },
];

export function getRoundByXP(xp: number): Round {
  const safe = Math.max(0, Math.floor(xp));

  for (let i = ROUNDS.length - 1; i >= 0; i--) {
    if (safe >= ROUNDS[i]!.xpRequired) return ROUNDS[i]!;
  }

  return ROUNDS[0]!;
}

export function getRoundProgress(xp: number): number {
  const current = getRoundByXP(xp);
  if (current.round === MAX_LEVEL) return 100;

  const earned = Math.max(0, Math.floor(xp)) - current.xpRequired;
  return Math.min(Math.round((earned / current.xpToNext) * 100), 100);
}

export function getXPToNext(xp: number): number {
  const current = getRoundByXP(xp);
  if (current.round === MAX_LEVEL) return 0;
  return current.xpRequired + current.xpToNext - Math.max(0, Math.floor(xp));
}

export const XP_SOURCES = [
  { action: "Прошёл тренировку", xp: 100, icon: "🥊" },
  { action: "Первый сплит", xp: 200, icon: "⚡" },
  { action: "Streak 3 дня подряд", xp: 50, icon: "🔥" },
  { action: "Streak 7 дней подряд", xp: 200, icon: "🔥🔥" },
  { action: "Оставил отзыв", xp: 30, icon: "⭐" },
  { action: "Пригласил друга", xp: 150, icon: "👥" },
  { action: "Победа в рейтинговом", xp: 300, icon: "🏆" },
  { action: "Загрузил видео", xp: 50, icon: "🎥" },
  { action: "Daily login", xp: 10, icon: "📅" },
] as const;

export function canAccessTrainer(userXP: number, trainerMinRound: number): boolean {
  return getRoundByXP(userXP).round >= trainerMinRound;
}

// ── UI helpers (RoundProgress · passport) ───────────────────────────────────

export type RoundTierGroup = Readonly<{
  id: string;
  nameRu: RoundTier;
  from: number;
  to: number;
  color: string;
  glowColor: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}>;

const TIER_UI: Record<
  RoundTier,
  Pick<RoundTierGroup, "textClass" | "bgClass" | "borderClass">
> = {
  Новичок: {
    textClass: "text-zinc-400",
    bgClass: "bg-zinc-500/15",
    borderClass: "border-zinc-500/40",
  },
  Боец: {
    textClass: "text-blue-400",
    bgClass: "bg-blue-500/15",
    borderClass: "border-blue-500/40",
  },
  Ветеран: {
    textClass: "text-purple-400",
    bgClass: "bg-purple-500/15",
    borderClass: "border-purple-500/40",
  },
  Элита: {
    textClass: "text-yellow-400",
    bgClass: "bg-yellow-400/15",
    borderClass: "border-yellow-400/40",
  },
  Легенда: {
    textClass: "text-red-400",
    bgClass: "bg-red-500/15",
    borderClass: "border-red-500/40",
  },
};

const TIER_RANGES: ReadonlyArray<{ tier: RoundTier; from: number; to: number; id: string }> = [
  { id: "novice", tier: "Новичок", from: 1, to: 5 },
  { id: "fighter", tier: "Боец", from: 6, to: 10 },
  { id: "veteran", tier: "Ветеран", from: 11, to: 15 },
  { id: "elite", tier: "Элита", from: 16, to: 20 },
  { id: "legend", tier: "Легенда", from: 21, to: 23 },
];

export const ROUND_TIERS: readonly RoundTierGroup[] = TIER_RANGES.map((range) => {
  const sample = ROUNDS.find((r) => r.tier === range.tier)!;
  const ui = TIER_UI[range.tier];

  return {
    id: range.id,
    nameRu: range.tier,
    from: range.from,
    to: range.to,
    color: sample.color,
    glowColor: sample.glowColor,
    ...ui,
  };
});

export function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(level)));
}

export function getRound(level: number): Round {
  return ROUNDS[clampLevel(level) - 1] ?? ROUNDS[0]!;
}

export function roundTierFor(level: number): RoundTierGroup {
  const round = getRound(level);
  const range = TIER_RANGES.find((r) => r.tier === round.tier)!;
  const ui = TIER_UI[round.tier];

  return {
    id: range.id,
    nameRu: round.tier,
    from: range.from,
    to: range.to,
    color: round.color,
    glowColor: round.glowColor,
    ...ui,
  };
}

export function roundTierLabel(level: number): string {
  return getRound(level).tier;
}

export function roundTierColor(level: number): string {
  return getRound(level).color;
}

export type RankReward = Readonly<{
  name: string;
  perk: string;
  xpBonusPct: number;
  color: string;
  textClass: string;
}>;

const TIER_XP_BONUS: Record<RoundTier, number> = {
  Новичок: 0,
  Боец: 2,
  Ветеран: 4,
  Элита: 7,
  Легенда: 10,
};

export function rankRewardFor(level: number): RankReward {
  const round = getRound(level);
  const tier = roundTierFor(level);

  return {
    name: round.tier,
    perk: round.unlocksLabel,
    xpBonusPct: TIER_XP_BONUS[round.tier],
    color: round.color,
    textClass: tier.textClass,
  };
}
