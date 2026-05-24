// TODO(i18n S+1): native review by a Kazakh speaker.

import type { WarriorDictionary } from "@/lib/i18n/types";
import { ru } from "@/lib/i18n/dictionaries/ru";

export const kk: WarriorDictionary = {
  ...ru,
  meta: {
    ...ru.meta,
    tagline: "Әлемдік жекпе-жек реестрі",
  },
  nav: {
    passport: "Төлқұжат",
    leaderboard: "Лидерборд",
  },
  language: {
    switchLabel: "Тіл",
    currentLabel: "Қазіргі тіл",
  },
};
