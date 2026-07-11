// Система прогресса и микро-мотиваций Round 23
// "Лучшая борьба — борьба с самим собой"

export type MonthActivity = {
  sessions: number;
  xpGained: number;
  eloChange: number;
  streakDays: number;
  prevMonthSessions: number;
};

export type ActivityLevel = {
  level: "low" | "normal" | "good" | "excellent";
  label: string;
  color: string;
  minSessions: number;
  emoji: string;
};

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { level: "low", label: "Разминка", color: "#6b7280", minSessions: 0, emoji: "🌱" },
  { level: "normal", label: "В строю", color: "#3b82f6", minSessions: 6, emoji: "💪" },
  { level: "good", label: "В форме", color: "#C9A84C", minSessions: 8, emoji: "🔥" },
  { level: "excellent", label: "Машина", color: "#ef4444", minSessions: 10, emoji: "⚡" },
];

export function getActivityLevel(sessions: number): ActivityLevel {
  for (let i = ACTIVITY_LEVELS.length - 1; i >= 0; i--) {
    const level = ACTIVITY_LEVELS[i];
    if (level && sessions >= level.minSessions) return level;
  }
  return ACTIVITY_LEVELS[0]!;
}

export type Motivation = {
  headline: string;
  message: string;
  emoji: string;
  tone: "fire" | "proud" | "push" | "calm";
};

export function getMotivation(activity: MonthActivity): Motivation {
  const { sessions, prevMonthSessions } = activity;
  const improved = sessions > prevMonthSessions;
  const sessionDiff = sessions - prevMonthSessions;

  if (sessions >= 10) {
    const excellent: Motivation[] = [
      { headline: "Ты машина 🔥", message: `${sessions} тренировок в этом месяце. Это уровень профи.`, emoji: "⚡", tone: "fire" },
      { headline: "Зверь проснулся", message: `${sessions} сессий. Ты в топ-5% всех бойцов платформы.`, emoji: "🔥", tone: "fire" },
      { headline: "Несокрушим", message: "Лучшая борьба — борьба с собой. И ты её выигрываешь.", emoji: "👑", tone: "proud" },
    ];
    return pickByDay(excellent);
  }

  if (sessions >= 8) {
    const good: Motivation[] = [
      { headline: "Ты в форме", message: `${sessions} тренировок — это сильно. Ещё чуть-чуть до уровня "Машина".`, emoji: "🔥", tone: "proud" },
      { headline: "Стабильность — сила", message: `${sessions} сессий за месяц. Так держать!`, emoji: "💪", tone: "proud" },
      { headline: "Растёшь", message: improved ? `На ${sessionDiff} тренировки больше чем в прошлом месяце!` : "Ты стал лучше, чем вчера.", emoji: "📈", tone: "proud" },
    ];
    return pickByDay(good);
  }

  if (sessions >= 6) {
    const normal: Motivation[] = [
      { headline: "Ты в строю 💪", message: `${sessions} тренировок — это норма бойца. Не сдавайся.`, emoji: "💪", tone: "calm" },
      { headline: "Держишь темп", message: improved ? `Прогресс есть — на ${sessionDiff} больше прошлого месяца.` : "Стабильно. Попробуй добавить ещё одну на этой неделе.", emoji: "✊", tone: "calm" },
      { headline: "Хорошая база", message: "Самая лучшая борьба — борьба с самим собой. И ты стал лучше, чем вчера.", emoji: "🥊", tone: "proud" },
    ];
    return pickByDay(normal);
  }

  if (sessions >= 1 && improved) {
    return {
      headline: "Движение вперёд",
      message: `${sessions} тренировки — и это уже больше чем в прошлом месяце. Продолжай!`,
      emoji: "🌱",
      tone: "push",
    };
  }

  if (sessions >= 1) {
    const low: Motivation[] = [
      { headline: "Начало положено", message: `${sessions} тренировки за месяц. Цель — 6. Ты сможешь.`, emoji: "🌱", tone: "push" },
      { headline: "Каждый чемпион начинал", message: "Одна тренировка сегодня лучше, чем ноль. Запишись на сплит.", emoji: "💫", tone: "push" },
    ];
    return pickByDay(low);
  }

  return {
    headline: "Пора в зал 🥊",
    message: "Твой профиль ждёт. Первая тренировка в этом месяце — за тобой.",
    emoji: "🔥",
    tone: "push",
  };
}

export function getStreakMotivation(streakDays: number): string | null {
  if (streakDays >= 30) return "🏆 30 дней подряд! Ты в зоне легенд.";
  if (streakDays >= 21) return "👑 21 день серии. Железная дисциплина.";
  if (streakDays >= 14) return "⚡ 2 недели без пропусков. Ты машина.";
  if (streakDays >= 7) return "🔥 Неделя серии! Так держать.";
  if (streakDays >= 3) return "💪 3 дня подряд. Привычка формируется.";
  return null;
}

export function getEloMotivation(eloChange: number): string | null {
  if (eloChange >= 100) return `📈 +${eloChange} ELO за месяц — космический рост!`;
  if (eloChange >= 50) return `📈 +${eloChange} ELO. Ты растёшь быстро.`;
  if (eloChange >= 20) return `📈 +${eloChange} ELO. Прогресс налицо.`;
  if (eloChange > 0) return `📈 +${eloChange} ELO. Каждый шаг важен.`;
  return null;
}

function pickByDay<T>(arr: T[]): T {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
  );
  return arr[dayOfYear % arr.length]!;
}

export function getNextLevelHint(
  sessions: number,
): { needed: number; nextLabel: string } | null {
  const current = getActivityLevel(sessions);
  const currentIndex = ACTIVITY_LEVELS.indexOf(current);
  if (currentIndex >= ACTIVITY_LEVELS.length - 1) return null;
  const next = ACTIVITY_LEVELS[currentIndex + 1];
  if (!next) return null;
  return {
    needed: next.minSessions - sessions,
    nextLabel: next.label,
  };
}
