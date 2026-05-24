import type { WarriorDictionary } from "@/lib/i18n/types";

export const ru: WarriorDictionary = {
  meta: {
    appName: "Warrior Point",
    passportTitle: "Warrior Passport · Глобальный реестр",
    leaderboardTitle: "Лидерборд · Warrior Point",
    tagline: "Суверенный леджер боёв · по всему миру",
  },
  nav: {
    passport: "Паспорт",
    leaderboard: "Лидерборд",
  },
  passport: {
    header: {
      eyebrow: "Warrior Passport",
      subtitle: "Глобальный реестр · трансграничный документ",
    },
    identity: {
      combatantId: "ID бойца",
      tierRank: "Текущий ранг",
      levelPrefix: "Уровень",
      levelSeparator: "/",
    },
    xp: {
      arcLabel: "XP·дуга",
      toNextGate: (xp) => `${xp} XP до следующего гейта`,
      grandmasterOrbit: "Орбита Grandmaster",
      globalEcho: "Глобальная прогрессия",
      grandmasterFrontier: "Граница Grandmaster",
    },
    elo: {
      title: "Глобальный ELO",
      deltaSuffix: "за 30 дней",
      worldwideStanding: "Мировая позиция",
      topPercentile: (pct) => `Топ ${pct}%`,
      percentileNote: "процентиль · живой пул лидерборда",
      lifetimeSessions: "Аудированные сессии · за всё время",
    },
    payouts: {
      title: "Суверенные выплаты · RUB",
      gross: "Брутто",
      fee: (pct) => `Комиссия платформы (${pct}%)`,
      net: "Бойцу на руки",
      note: "Цифры отражают удержания Warrior Point · 19% протокольная комиссия с каждой санкционированной строки.",
    },
    biometrics: {
      title: "Биометрия",
      readyBadge: "Ready for Apple Health",
      intro: "Зашифрованный физиологический резерв для трансграничных санкционных проверок.",
      hrv: "HRV",
      recovery: "Восстановление",
      loadIndex: "Индекс нагрузки",
      syncStandby: "ожидание синхронизации",
    },
    actions: {
      ledgerSyncTitle: "Синхронизация леджера тренировок",
      ledgerSyncIntro: (pct) =>
        `Заносим экономику санкционированной сессии: комиссия платформы — ${pct}%, XP начисляется от чистой выплаты.`,
      billPerSession: "Тариф за сессию · демо",
      recordSession: "ЗАПИСАТЬ СЕССИЮ",
      syncing: "СИНХ…",
      dataSynced: "Data synced with Supabase!",
      envMissing:
        "Supabase env пуст · добавь NEXT_PUBLIC_* ключи в `.env.local`",
    },
    rehydrating: "Подгружаю суверенный леджер…",
    profileDetails: {
      title: "Профиль бойца · детали",
      liveLedger: (count) => `Живой леджер · ${count} сессий`,
      totalSessions: {
        label: "Total Sessions",
        hint: "Аудированных тренировок",
        note: "Каждое нажатие RECORD SESSION = строка в `training_sessions` (1 000 ₽ gross)",
      },
      careerEarnings: {
        label: "Career Earnings",
        hint: "Брутто до 19% удержания",
        note: "Сумма `gross_amount` со всех аудированных сессий бойца",
      },
      coachRevenue: {
        label: "Coach Revenue",
        hint: (pct) => `${pct}% протокольное удержание`,
        note: (pct) => `${pct}% удержание платформы · кэш тренеру / Warrior Point`,
      },
    },
    lastSession: {
      title: "Последняя санкция",
      gross: "Брутто",
      feeLabel: (pct) => `Комиссия ${pct}%`,
      net: "Нетто",
      xpRouted: "Зачислено XP",
    },
    levelUp: {
      brand: "Warrior Point",
      levelWord: "LEVEL",
      upWord: "UP",
      rankPrefix: "Ранг",
      surge: (jumps) => `+${jumps} прыжков по тиерам · взрыв удостоверен`,
      ladderUpdated: "Глобальная лестница обновлена",
    },
    footer: "Warrior Point · Суверенный леджер · по всему миру",
  },
  leaderboard: {
    eyebrow: "Глобальная лестница",
    title: "Лидерборд · Топ‑10",
    intro: "Суверенный реестр XP · аудированный объём тренировок",
    columns: {
      rank: "Ранг",
      name: "Имя",
      xp: "ХР",
      workouts: "Трен‑ки",
    },
    emptyKeys: "Нет конфигурации · ленты пусты",
    emptyData: "Пока нет записей в fighter_stats · отметь сеанс",
    envMissingWarning:
      "Supabase ключи отсутствуют · добавь NEXT_PUBLIC_* в `.env.local`",
  },
  language: {
    switchLabel: "Язык",
    currentLabel: "Текущий язык",
  },
};
