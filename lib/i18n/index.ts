import { az } from "@/lib/i18n/dictionaries/az";
import { be } from "@/lib/i18n/dictionaries/be";
import { en } from "@/lib/i18n/dictionaries/en";
import { hy } from "@/lib/i18n/dictionaries/hy";
import { kk } from "@/lib/i18n/dictionaries/kk";
import { ky } from "@/lib/i18n/dictionaries/ky";
import { ru } from "@/lib/i18n/dictionaries/ru";
import { uk } from "@/lib/i18n/dictionaries/uk";
import { uz } from "@/lib/i18n/dictionaries/uz";
import {
  DEFAULT_LOCALE,
  isWarriorLocale,
  resolveWarriorLocale,
  SUPPORTED_LOCALES,
  type WarriorLocale,
} from "@/lib/i18n/locales";
import type { WarriorDictionary } from "@/lib/i18n/types";

export {
  DEFAULT_LOCALE,
  isWarriorLocale,
  resolveWarriorLocale,
  SUPPORTED_LOCALES,
};
export type { WarriorDictionary, WarriorLocale };

const DICTIONARIES: Readonly<Record<WarriorLocale, WarriorDictionary>> = {
  ru,
  en,
  uk,
  be,
  kk,
  uz,
  az,
  hy,
  ky,
};

export function getDictionary(locale: WarriorLocale): WarriorDictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** Convenience for server components: accept raw header / cookie. */
export function getDictionaryByHint(hint: string | null | undefined): {
  locale: WarriorLocale;
  dict: WarriorDictionary;
} {
  const locale = resolveWarriorLocale(hint);

  return { locale, dict: getDictionary(locale) };
}
