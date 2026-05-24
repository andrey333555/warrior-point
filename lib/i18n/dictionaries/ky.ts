// TODO(i18n S+1): native review by a Kyrgyz speaker.

import type { WarriorDictionary } from "@/lib/i18n/types";
import { ru } from "@/lib/i18n/dictionaries/ru";

export const ky: WarriorDictionary = {
  ...ru,
  meta: {
    ...ru.meta,
    tagline: "Эгемен согуш реестри · бүт дүйнө боюнча",
  },
  nav: {
    passport: "Паспорт",
    leaderboard: "Лидерборд",
  },
  language: {
    switchLabel: "Тил",
    currentLabel: "Учурдагы тил",
  },
};
