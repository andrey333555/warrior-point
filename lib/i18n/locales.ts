/** Warrior Point sovereign locales — RU baseline + CIS rollout. */

export const SUPPORTED_LOCALES = [
  "ru",
  "en",
  "uk",
  "be",
  "kk",
  "uz",
  "az",
  "hy",
  "ky",
] as const;

export type WarriorLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: WarriorLocale = "ru";

/** UI metadata (used by `<LocaleSwitch />` once wired in S+1). */
export const LOCALE_LABELS: Record<
  WarriorLocale,
  Readonly<{ native: string; latin: string; flag: string }>
> = {
  ru: { native: "Русский", latin: "Russian", flag: "RU" },
  en: { native: "English", latin: "English", flag: "EN" },
  uk: { native: "Українська", latin: "Ukrainian", flag: "UA" },
  be: { native: "Беларуская", latin: "Belarusian", flag: "BY" },
  kk: { native: "Қазақша", latin: "Kazakh", flag: "KZ" },
  uz: { native: "Oʻzbekcha", latin: "Uzbek", flag: "UZ" },
  az: { native: "Azərbaycanca", latin: "Azerbaijani", flag: "AZ" },
  hy: { native: "Հայերեն", latin: "Armenian", flag: "AM" },
  ky: { native: "Кыргызча", latin: "Kyrgyz", flag: "KG" },
};

export function isWarriorLocale(value: string): value is WarriorLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Resolve `Accept-Language` / cookie / route segment to a sanctioned locale. */
export function resolveWarriorLocale(
  raw: string | null | undefined,
): WarriorLocale {
  if (!raw) return DEFAULT_LOCALE;

  const head = raw.split(",")[0]?.trim().toLowerCase().split("-")[0] ?? "";

  return isWarriorLocale(head) ? (head as WarriorLocale) : DEFAULT_LOCALE;
}
