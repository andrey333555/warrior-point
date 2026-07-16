"use client";

import { useEffect, useState } from "react";
import { clientInitial } from "@/lib/client-store";
import { loadData, saveData, STORAGE_KEYS } from "@/lib/storage";

/** User preference — what they pick in settings. */
export type ThemePreference = "dark" | "light" | "hybrid" | "auto";

/** Resolved visual mode after applying auto / time rules. */
export type ThemeMode = "dark" | "light" | "hybrid";

export const THEME_OPTIONS: {
  id: ThemePreference;
  label: string;
  hint: string;
  emoji: string;
}[] = [
  { id: "dark", label: "Тёмная", hint: "Cyber-Loft · чёрный", emoji: "🌑" },
  { id: "light", label: "Светлая", hint: "Белый фон · читаемо", emoji: "☀️" },
  {
    id: "hybrid",
    label: "Гибрид",
    hint: "Светлый верх · тёмный акцент",
    emoji: "◐",
  },
  {
    id: "auto",
    label: "Авто",
    hint: "Днём светлая · ночью тёмная",
    emoji: "🕒",
  },
];

const DEFAULT_PREF: ThemePreference = "dark";

type Listener = (pref: ThemePreference) => void;
const listeners = new Set<Listener>();

function isThemePreference(v: unknown): v is ThemePreference {
  return v === "dark" || v === "light" || v === "hybrid" || v === "auto";
}

export function getThemePreference(): ThemePreference {
  const raw = loadData<unknown>(STORAGE_KEYS.theme, DEFAULT_PREF);
  return isThemePreference(raw) ? raw : DEFAULT_PREF;
}

export function setThemePreference(pref: ThemePreference): void {
  saveData(STORAGE_KEYS.theme, pref);
  applyThemeToDocument(pref);
  listeners.forEach((l) => l(pref));
}

/** Day 07:00–19:59 → light, night → dark. */
export function resolveThemeMode(
  pref: ThemePreference,
  now = new Date(),
): ThemeMode {
  if (pref !== "auto") return pref;
  const hour = now.getHours();
  return hour >= 7 && hour < 20 ? "light" : "dark";
}

export function applyThemeToDocument(pref: ThemePreference = getThemePreference()): void {
  if (typeof document === "undefined") return;
  const mode = resolveThemeMode(pref);
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.themePref = pref;
  root.style.colorScheme =
    mode === "light" || mode === "hybrid" ? "light" : "dark";
  root.classList.remove("theme-dark", "theme-light", "theme-hybrid");
  root.classList.add(`theme-${mode}`);
  document.body.style.backgroundColor = getComputedStyle(root)
    .getPropertyValue("--background")
    .trim();
  document.body.style.color = getComputedStyle(root)
    .getPropertyValue("--foreground")
    .trim();
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThemePreference(): {
  preference: ThemePreference;
  mode: ThemeMode;
  setPreference: (pref: ThemePreference) => void;
} {
  const [preference, setPrefState] = useState<ThemePreference>(() =>
    clientInitial(getThemePreference, DEFAULT_PREF),
  );
  const [mode, setMode] = useState<ThemeMode>(() =>
    clientInitial(() => resolveThemeMode(getThemePreference()), "dark"),
  );

  useEffect(() => {
    const sync = (pref: ThemePreference) => {
      setPrefState(pref);
      setMode(resolveThemeMode(pref));
      applyThemeToDocument(pref);
    };
    sync(getThemePreference());
    return subscribeTheme(sync);
  }, []);

  // Re-resolve auto theme when the hour rolls over
  useEffect(() => {
    if (preference !== "auto") return;
    const tick = () => setMode(resolveThemeMode("auto"));
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [preference]);

  return {
    preference,
    mode,
    setPreference: setThemePreference,
  };
}

export type PosterPalette = {
  bg: string;
  bgBottom: string;
  text: string;
  muted: string;
  faint: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  gridOpacity: number;
  captureBg: string;
};

export function getPosterPalette(
  mode: ThemeMode,
  accentGold = "#C9A84C",
): PosterPalette {
  if (mode === "light") {
    return {
      bg: "#FFFFFF",
      bgBottom: "#F4F4F5",
      text: "#0A0A0A",
      muted: "rgba(10,10,10,0.55)",
      faint: "rgba(10,10,10,0.35)",
      cardBg: "rgba(10,10,10,0.04)",
      cardBorder: "rgba(10,10,10,0.1)",
      accent: accentGold,
      gridOpacity: 0.04,
      captureBg: "#FFFFFF",
    };
  }

  if (mode === "hybrid") {
    return {
      bg: "#F7F5F0",
      bgBottom: "#0A0A0A",
      text: "#0A0A0A",
      muted: "rgba(10,10,10,0.5)",
      faint: "rgba(10,10,10,0.32)",
      cardBg: "rgba(255,255,255,0.75)",
      cardBorder: "rgba(10,10,10,0.1)",
      accent: accentGold,
      gridOpacity: 0.05,
      captureBg: "#F7F5F0",
    };
  }

  return {
    bg: "#0A0A0A",
    bgBottom: "#0A0A0A",
    text: "#FFFFFF",
    muted: "rgba(255,255,255,0.5)",
    faint: "rgba(255,255,255,0.35)",
    cardBg: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(255,255,255,0.1)",
    accent: accentGold,
    gridOpacity: 0.06,
    captureBg: "#0A0A0A",
  };
}
