// TODO(i18n S+1): native review by an Azerbaijani speaker.

import type { WarriorDictionary } from "@/lib/i18n/types";
import { ru } from "@/lib/i18n/dictionaries/ru";

export const az: WarriorDictionary = {
  ...ru,
  meta: {
    ...ru.meta,
    tagline: "Suveren döyüş reyestri · dünya üzrə",
  },
  nav: {
    passport: "Pasport",
    leaderboard: "Liderlər lövhəsi",
  },
  language: {
    switchLabel: "Dil",
    currentLabel: "Cari dil",
  },
};
