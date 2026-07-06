"use client";

import { useEffect, useState } from "react";
import { saveData, loadData, STORAGE_KEYS } from "@/lib/storage";
import { clientInitial } from "@/lib/client-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export type XpEventType = "training" | "streak" | "goal";

export type XpEvent = {
  id: string;
  type: XpEventType;
  amount: number;
  label: string;
  ts: number;
};

export type XpState = {
  total: number;
  streakDays: number;
  lastWorkoutDate: string | null; // ISO date "YYYY-MM-DD"
  history: XpEvent[];
};

// ── XP rewards ────────────────────────────────────────────────────────────────

export const XP_REWARDS: Record<XpEventType, number> = {
  training: 50,
  streak: 100,
  goal: 30,
};

// ── Level formula ─────────────────────────────────────────────────────────────

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 100);
}

/** XP needed to reach the next level. */
export function xpForNextLevel(xp: number): number {
  const nextLevel = levelFromXp(xp) + 1;
  return nextLevel * 100;
}

/** XP progress within the current level (0–100). */
export function xpProgress(xp: number): number {
  return xp % 100;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = STORAGE_KEYS.xp;

type Listener = (state: XpState) => void;
let cache: XpState | null = null;
const listeners = new Set<Listener>();

const DEFAULT_STATE: XpState = {
  total: 0,
  streakDays: 0,
  lastWorkoutDate: null,
  history: [],
};

function load(): XpState {
  return loadData<XpState>(STORAGE_KEY, { ...DEFAULT_STATE });
}

function persist(next: XpState): void {
  cache = next;
  saveData(STORAGE_KEY, next);
  listeners.forEach((l) => l(next));
}

export function getXp(): XpState {
  if (cache == null) cache = load();
  return cache;
}

// ── Streak logic ──────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Award functions ───────────────────────────────────────────────────────────

function makeId(): string {
  return `xp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Award XP for a completed training session.
 * Also handles streak tracking and streak bonus.
 */
export function awardTrainingXp(label = "Тренировка"): XpState {
  const state = getXp();
  const today = todayIso();
  const events: XpEvent[] = [...state.history];
  let total = state.total;
  let streakDays = state.streakDays;

  // Training XP
  const trainingEvent: XpEvent = {
    id: makeId(),
    type: "training",
    amount: XP_REWARDS.training,
    label,
    ts: Date.now(),
  };
  events.push(trainingEvent);
  total += XP_REWARDS.training;

  // Streak update
  if (state.lastWorkoutDate === yesterdayIso()) {
    streakDays += 1;
  } else if (state.lastWorkoutDate !== today) {
    streakDays = 1;
  }
  // Already trained today — don't reset streak, don't increment

  // Streak bonus (every 3rd consecutive day)
  if (streakDays > 0 && streakDays % 3 === 0) {
    const streakEvent: XpEvent = {
      id: makeId(),
      type: "streak",
      amount: XP_REWARDS.streak,
      label: `Серия ${streakDays} дней`,
      ts: Date.now(),
    };
    events.push(streakEvent);
    total += XP_REWARDS.streak;
  }

  const next: XpState = {
    total,
    streakDays,
    lastWorkoutDate: today,
    history: events.slice(-50), // keep last 50 events
  };

  persist(next);
  return next;
}

/** Award XP for setting a new training goal. */
export function awardGoalXp(goalLabel: string): XpState {
  const state = getXp();
  const event: XpEvent = {
    id: makeId(),
    type: "goal",
    amount: XP_REWARDS.goal,
    label: goalLabel,
    ts: Date.now(),
  };
  const next: XpState = {
    ...state,
    total: state.total + XP_REWARDS.goal,
    history: [...state.history, event].slice(-50),
  };
  persist(next);
  return next;
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useXp(): XpState {
  const [state, setState] = useState<XpState>(() =>
    clientInitial(() => getXp(), { ...DEFAULT_STATE }),
  );

  useEffect(() => {
    setState(getXp());
    const listener: Listener = (next) => setState(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
