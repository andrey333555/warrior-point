import { loadData, saveData, STORAGE_KEYS } from "@/lib/storage";

export type FighterOnboardingData = {
  name: string;
  nickname?: string;
  city: string;
  club: string;
  style: string;
  weight?: number;
  height?: number;
  record?: string;
  socialLinks?: { telegram?: string; instagram?: string; vk?: string };
};

export function saveFighterOnboarding(data: FighterOnboardingData): void {
  saveData(STORAGE_KEYS.fighterOnboarding, data);
}

export function loadFighterOnboarding(): FighterOnboardingData | null {
  return loadData<FighterOnboardingData | null>(
    STORAGE_KEYS.fighterOnboarding,
    null,
  );
}

export function cityFromClub(club: string): string {
  if (club === "Другой") return "";
  const parts = club.split("·");
  return (parts[1] ?? "").trim();
}

export const STYLE_LABELS: Record<string, string> = {
  mma: "ММА",
  boxing: "Бокс",
  "muay-thai": "Муай-тай",
  kickboxing: "Кикбоксинг",
  wrestling: "Борьба",
  bjj: "BJJ",
};
