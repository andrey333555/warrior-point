"use client";

import { useEffect, useState } from "react";
import type { Goal as AiGoal, Format, Level } from "@/lib/ai-match";
import { saveData, loadData, STORAGE_KEYS } from "@/lib/storage";
import { clientInitial } from "@/lib/client-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserGoal = {
  id: string;
  icon: string;
  label: string;
  description: string;
  target: number;
  unit: string;
  createdAt: number;
  /** Snapshot of completed bookings count at creation — used to calc delta. */
  baseCount: number;
  source: "ai" | "manual";
};

// ── Goal templates from AI preferences ───────────────────────────────────────

const GOAL_TEMPLATES: Record<AiGoal, { icon: string; label: string; description: string; target: number }> = {
  "weight-loss": {
    icon: "🔥",
    label: "Похудеть на 5 кг",
    description: "Регулярные тренировки для жиросжигания",
    target: 20,
  },
  mass: {
    icon: "💪",
    label: "Набрать 3 кг массы",
    description: "Силовые и функциональные тренировки",
    target: 20,
  },
  mma: {
    icon: "🥊",
    label: "Подготовка к бою",
    description: "Fight camp — ударка, борьба, спарринги",
    target: 12,
  },
  fitness: {
    icon: "⚡",
    label: "Привести тело в форму",
    description: "Общая физическая подготовка",
    target: 15,
  },
};

const MONTHLY_GOAL: Omit<UserGoal, "id" | "createdAt" | "baseCount"> = {
  icon: "📅",
  label: "10 тренировок в месяц",
  description: "Ежемесячная цель активности",
  target: 10,
  unit: "тренировок",
  source: "manual",
};

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = STORAGE_KEYS.goals;

type Listener = (goals: UserGoal[]) => void;
let cache: UserGoal[] | null = null;
const listeners = new Set<Listener>();

function load(): UserGoal[] {
  return loadData<UserGoal[]>(STORAGE_KEY, []);
}

function persist(next: UserGoal[]): void {
  cache = next;
  saveData(STORAGE_KEY, next);
  listeners.forEach((l) => l(next));
}

export function getGoals(): UserGoal[] {
  if (cache == null) cache = load();
  return cache;
}

// ── Create / update ───────────────────────────────────────────────────────────

export function createGoalFromAi(
  aiGoal: AiGoal,
  _level: Level,
  _format: Format,
  currentBookingCount: number,
): UserGoal[] {
  const existing = getGoals();

  // Don't duplicate same ai goal type
  if (existing.some((g) => g.source === "ai" && g.label === GOAL_TEMPLATES[aiGoal].label)) {
    return existing;
  }

  const template = GOAL_TEMPLATES[aiGoal];
  const aiGoalEntry: UserGoal = {
    id: `goal-ai-${Date.now()}`,
    ...template,
    unit: "тренировок",
    createdAt: Date.now(),
    baseCount: currentBookingCount,
    source: "ai",
  };

  // Also ensure monthly goal exists
  const hasMonthly = existing.some((g) => g.label === MONTHLY_GOAL.label);
  const monthlyEntry: UserGoal | null = hasMonthly ? null : {
    id: `goal-monthly-${Date.now() + 1}`,
    ...MONTHLY_GOAL,
    createdAt: Date.now(),
    baseCount: currentBookingCount,
  };

  const next = [
    aiGoalEntry,
    ...(monthlyEntry ? [monthlyEntry] : []),
    ...existing,
  ];

  persist(next);
  return next;
}

export function ensureDefaultGoals(currentBookingCount: number): void {
  const existing = getGoals();
  if (existing.length > 0) return;

  const monthly: UserGoal = {
    id: `goal-monthly-default`,
    ...MONTHLY_GOAL,
    createdAt: Date.now(),
    baseCount: currentBookingCount,
  };
  persist([monthly]);
}

// ── Progress calculation ──────────────────────────────────────────────────────

/**
 * currentCount = total bookings now
 * Returns progress [0..1] clamped to 1.
 */
export function goalProgress(goal: UserGoal, currentCount: number): number {
  const delta = Math.max(0, currentCount - goal.baseCount);
  return Math.min(delta / goal.target, 1);
}

export function goalPercent(goal: UserGoal, currentCount: number): number {
  return Math.round(goalProgress(goal, currentCount) * 100);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGoals(): UserGoal[] {
  const [goals, setGoals] = useState<UserGoal[]>(() =>
    clientInitial(() => getGoals(), []),
  );

  useEffect(() => {
    setGoals(getGoals());
    const listener: Listener = (next) => setGoals(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return goals;
}
