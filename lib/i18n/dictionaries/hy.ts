// TODO(i18n S+1): native review by an Armenian speaker.

import type { WarriorDictionary } from "@/lib/i18n/types";
import { ru } from "@/lib/i18n/dictionaries/ru";

export const hy: WarriorDictionary = {
  ...ru,
  meta: {
    ...ru.meta,
    tagline: "Ինքնիշխան մարտի մատյան · ողջ աշխարհում",
  },
  nav: {
    passport: "Անձնագիր",
    leaderboard: "Առաջատարների ցուցակ",
  },
  language: {
    switchLabel: "Լեզու",
    currentLabel: "Ընթացիկ լեզու",
  },
};
