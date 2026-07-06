import { type Trainer, type Gym, trainers, findGym } from "@/lib/network";

export type Goal = "weight-loss" | "mass" | "mma" | "fitness";
export type Level = "beginner" | "intermediate" | "advanced";
export type Format = "individual" | "group" | "split";

export type Preferences = {
  goal: Goal;
  level: Level;
  format: Format;
};

export type MatchResult = {
  trainer: Trainer;
  gym: Gym | undefined;
  score: number;
  reason: string;
};

// ── Keyword maps ──────────────────────────────────────────────────────────────

const GOAL_KEYWORDS: Record<Goal, string[]> = {
  "weight-loss": ["функционал", "ударка", "mma"],
  mass:          ["сила", "функционал", "борьба"],
  mma:           ["mma", "ударка", "борьба", "bjj", "sparring"],
  fitness:       ["функционал", "ударка", "сплит", "персональная"],
};

const FORMAT_KEYWORDS: Record<Format, string[]> = {
  individual: ["персональная", "индивидуальная"],
  group:      ["группа", "group"],
  split:      ["сплит", "split", "mma", "ударка", "борьба", "bjj", "функционал", "сила", "sparring"],
};

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreTrainer(trainer: Trainer, prefs: Preferences): number {
  let score = 0;

  const trainingNames = trainer.trainings.map((t) => t.name.toLowerCase());

  // Goal match — each matching keyword +2
  for (const kw of GOAL_KEYWORDS[prefs.goal]) {
    if (trainingNames.some((n) => n.includes(kw))) score += 2;
  }

  // Format match — split trainers have multiple disciplines = +3
  for (const kw of FORMAT_KEYWORDS[prefs.format]) {
    if (trainingNames.some((n) => n.includes(kw))) score += 3;
  }

  // Level adjustment
  if (prefs.level === "beginner") {
    // Prefer trainers with more students (approachable)
    score += Math.min(trainer.fighters.length, 3);
    // Prefer lower price (more accessible)
    const minPrice = Math.min(...trainer.trainings.map((t) => t.price));
    if (minPrice <= 1600) score += 2;
  } else if (prefs.level === "advanced") {
    // Prefer high-rated, fewer slots (elite)
    score += trainer.rating >= 4.8 ? 3 : 0;
    score += trainer.subscriptionEnabled ? 2 : 0;
  } else {
    // Intermediate — balanced
    score += trainer.rating >= 4.6 ? 1 : 0;
  }

  // Rating bonus (0–5 pts)
  score += (trainer.rating - 4) * 5;

  // Subscription = premium signal
  if (trainer.subscriptionEnabled) score += 1;

  return score;
}

function matchReason(trainer: Trainer, prefs: Preferences): string {
  const trainingNames = trainer.trainings.map((t) => t.name.toLowerCase());

  if (prefs.goal === "mma" && trainingNames.some((n) => ["mma", "sparring"].some((k) => n.includes(k)))) {
    return "Специализируется на MMA и боевой подготовке";
  }
  if (prefs.goal === "weight-loss" && trainingNames.some((n) => n.includes("функционал"))) {
    return "Функциональный тренинг для результата";
  }
  if (prefs.goal === "mass" && trainingNames.some((n) => n.includes("сила"))) {
    return "Силовая база и fight conditioning";
  }
  if (prefs.format === "split" && trainer.trainings.length >= 2) {
    return "Несколько дисциплин · гибкий формат";
  }
  if (prefs.level === "beginner") {
    return "Работает с новичками и ставит базу";
  }
  if (prefs.level === "advanced" && trainer.rating >= 4.8) {
    return `Рейтинг ${trainer.rating.toFixed(1)} · элитный уровень`;
  }
  return `Рейтинг ${trainer.rating.toFixed(1)} · ${trainer.trainings[0]?.name ?? "все форматы"}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function matchTrainer(prefs: Preferences, top = 3): MatchResult[] {
  return trainers
    .map((t) => ({
      trainer: t,
      gym: findGym(t.gyms[0] ?? 0),
      score: scoreTrainer(t, prefs),
      reason: matchReason(t, prefs),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}
