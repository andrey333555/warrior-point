// TODO(i18n S+1): native review by a Belarusian speaker.

import type { WarriorDictionary } from "@/lib/i18n/types";
import { ru } from "@/lib/i18n/dictionaries/ru";

export const be: WarriorDictionary = {
  ...ru,
  meta: {
    ...ru.meta,
    tagline: "Суверэнны баявы рэестр · па ўсім свеце",
  },
  nav: {
    passport: "Пашпарт",
    leaderboard: "Лідэрборд",
  },
  language: {
    switchLabel: "Мова",
    currentLabel: "Бягучая мова",
  },
};
