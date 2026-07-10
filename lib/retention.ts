// Система удержания Round 23 — "Защита от обхода"
// 4 уровня: XP-потеря, Streak, Рейтинг тренера, Финансовая привязка

// ═══════════════════════════════════════════════════════════════
// 1. STREAK СИСТЕМА (клиент)
// ═══════════════════════════════════════════════════════════════

export type StreakData = {
  currentStreak: number;
  bestStreak: number;
  lastSessionDate: string;
  streakMultiplier: number;
  streakRewards: StreakReward[];
};

export type StreakReward = {
  days: number;
  reward: string;
  icon: string;
  claimed: boolean;
};

export const STREAK_REWARDS: StreakReward[] = [
  { days: 3, reward: "-10% на следующий сплит", icon: "🔥", claimed: false },
  { days: 7, reward: "-20% на сплит + 200 XP бонус", icon: "⚡", claimed: false },
  { days: 14, reward: "Бесплатный сплит (1 тренировка)", icon: "🎁", claimed: false },
  { days: 21, reward: "VIP на 3 дня бесплатно", icon: "👑", claimed: false },
  { days: 30, reward: "Розыгрыш iPhone + 1000 XP", icon: "🏆", claimed: false },
];

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.5;
  if (streak >= 21) return 2.0;
  if (streak >= 14) return 1.75;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.25;
  return 1.0;
}

export function isStreakAlive(lastSessionDate: string): boolean {
  const last = new Date(lastSessionDate);
  const now = new Date();
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  return diffHours <= 48;
}

export function getStreakLossMessage(streak: number): string {
  if (streak >= 14) {
    return `😱 Ты потерял серию ${streak} дней! Это стоило тебе множителя x${getStreakMultiplier(streak)} XP и бонусных наград. Начни заново!`;
  }
  if (streak >= 7) {
    return `😤 Серия ${streak} дней сброшена. Ты терял x${getStreakMultiplier(streak)} множитель XP. Возвращайся!`;
  }
  if (streak >= 3) {
    return `Серия ${streak} дней сброшена. Запишись на сплит чтобы начать заново.`;
  }
  return "Начни серию тренировок — уже после 3 дней получишь скидку!";
}

// ═══════════════════════════════════════════════════════════════
// 2. РЕЙТИНГ ТРЕНЕРА (тренер)
// ═══════════════════════════════════════════════════════════════

export type TrainerRating = {
  trainerId: string;
  totalSessions: number;
  monthSessions: number;
  avgRating: number;
  responseRate: number;
  eloScore: number;
  trustLevel: "Новый" | "Проверенный" | "Топ" | "Элита" | "Легенда";
  badges: string[];
  penaltyWarnings: number;
};

export function calculateTrainerELO(rating: TrainerRating): number {
  const sessionBonus = rating.monthSessions * 5;
  const ratingBonus = Math.round(rating.avgRating * 20);
  const responseBonus = Math.round(rating.responseRate * 0.5);
  return rating.eloScore + sessionBonus + ratingBonus + responseBonus;
}

export function getTrainerTrustLevel(
  rating: TrainerRating,
): TrainerRating["trustLevel"] {
  if (rating.totalSessions >= 500 && rating.avgRating >= 4.8) return "Легенда";
  if (rating.totalSessions >= 200 && rating.avgRating >= 4.5) return "Элита";
  if (rating.totalSessions >= 50 && rating.avgRating >= 4.0) return "Топ";
  if (rating.totalSessions >= 10) return "Проверенный";
  return "Новый";
}

export function applyInactivityPenalty(
  currentELO: number,
  daysSinceLastSession: number,
): number {
  if (daysSinceLastSession <= 7) return currentELO;
  if (daysSinceLastSession <= 14) return Math.round(currentELO * 0.98);
  if (daysSinceLastSession <= 30) return Math.round(currentELO * 0.95);
  return Math.round(currentELO * 0.9);
}

// ═══════════════════════════════════════════════════════════════
// 3. ФИНАНСОВАЯ ПРИВЯЗКА (клиент + тренер)
// ═══════════════════════════════════════════════════════════════

export type WalletData = {
  balance: number;
  totalCashback: number;
  pendingCashback: number;
  bonusBalance: number;
  referralEarnings: number;
};

export function calculateCashback(
  price: number,
  isVIP: boolean,
  streak: number,
): number {
  let rate = 0.05;
  if (isVIP) rate += 0.03;
  if (streak >= 7) rate += 0.02;
  if (streak >= 14) rate += 0.03;
  return Math.round(price * rate);
}

export function getReferralBonus(friendsCount: number): number {
  if (friendsCount <= 3) return 300;
  return 200;
}

/** Суммарный бонус streak к кэшбэку в процентах (для UI). */
export function getStreakCashbackBonusPercent(streak: number): number {
  let bonus = 0;
  if (streak >= 7) bonus += 2;
  if (streak >= 14) bonus += 3;
  return bonus;
}

// ═══════════════════════════════════════════════════════════════
// 4. ANTI-BYPASS ДЕТЕКЦИЯ
// ═══════════════════════════════════════════════════════════════

export type SessionPattern = {
  userId: string;
  trainerId: string;
  sessionsThisMonth: number;
  lastSessionDate: string;
  avgInterval: number;
};

export function detectBypassRisk(pattern: SessionPattern): {
  risk: "none" | "low" | "medium" | "high";
  action: string;
} {
  const daysSince = Math.round(
    (Date.now() - new Date(pattern.lastSessionDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (pattern.sessionsThisMonth >= 5 && daysSince > 14) {
    return {
      risk: "high",
      action: "push_notification",
    };
  }

  if (pattern.sessionsThisMonth >= 3 && daysSince > 10) {
    return {
      risk: "medium",
      action: "offer_discount",
    };
  }

  if (daysSince > 7) {
    return {
      risk: "low",
      action: "reminder",
    };
  }

  return { risk: "none", action: "none" };
}

export const RETENTION_MESSAGES = {
  streak_warning:
    "🔥 Твой streak обнулится через 24ч! Запишись на сплит чтобы сохранить бонусы.",
  streak_lost:
    "😤 Streak потерян. Но у нас для тебя -30% на следующую тренировку!",
  cashback_reminder:
    "💰 У тебя {amount}₽ кэшбэка на балансе. Используй на следующем сплите!",
  comeback_offer: "🎁 Мы скучаем! Вот 500 бонусных рублей на возвращение.",
  trainer_nudge:
    "⭐ Ваш тренер {name} получил новый рейтинг. Запишитесь к нему со скидкой!",
  level_up_soon:
    "🏆 До Раунда {round} осталось {xp} XP. Ещё одна тренировка!",
  vip_trial:
    "👑 Попробуй VIP бесплатно 3 дня — скидка 20% + доступ к топ-тренерам.",
} as const;
