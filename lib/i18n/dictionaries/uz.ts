// TODO(i18n S+1): native review by an Uzbek speaker (Latin script).

import type { WarriorDictionary } from "@/lib/i18n/types";
import { ru } from "@/lib/i18n/dictionaries/ru";

export const uz: WarriorDictionary = {
  ...ru,
  meta: {
    ...ru.meta,
    tagline: "Suveren jang reestri · butun dunyo boʻylab",
  },
  nav: {
    passport: "Pasport",
    leaderboard: "Liderbord",
  },
  language: {
    switchLabel: "Til",
    currentLabel: "Joriy til",
  },
};
