// TODO(i18n S+1): native review by a Ukrainian speaker — currently RU fallback
// with localized nav / meta only.

import type { WarriorDictionary } from "@/lib/i18n/types";
import { ru } from "@/lib/i18n/dictionaries/ru";

export const uk: WarriorDictionary = {
  ...ru,
  meta: {
    ...ru.meta,
    tagline: "Суверенний бойовий реєстр · по всьому світу",
  },
  nav: {
    passport: "Паспорт",
    leaderboard: "Лідерборд",
  },
  language: {
    switchLabel: "Мова",
    currentLabel: "Поточна мова",
  },
};
