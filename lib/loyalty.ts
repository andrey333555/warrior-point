import {
  type WalletData,
  type StreakData,
  STREAK_REWARDS,
  calculateCashback,
  getReferralBonus,
  getStreakCashbackBonusPercent,
  getStreakMultiplier,
  isStreakAlive,
  getStreakLossMessage,
} from "@/lib/retention";

export {
  type WalletData,
  type StreakData,
  STREAK_REWARDS,
  calculateCashback,
  getReferralBonus,
  getStreakCashbackBonusPercent,
  getStreakMultiplier,
  isStreakAlive,
  getStreakLossMessage,
};

export const DEFAULT_WALLET: WalletData = {
  balance: 340,
  bonusBalance: 120,
  pendingCashback: 80,
  totalCashback: 1240,
  referralEarnings: 500,
};

export function createStreakData(
  currentStreak: number,
  lastWorkoutDate: string | null,
  bestStreak = currentStreak,
): StreakData {
  const lastSessionDate = lastWorkoutDate
    ? new Date(`${lastWorkoutDate}T12:00:00`).toISOString()
    : new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    lastSessionDate,
    streakMultiplier: getStreakMultiplier(currentStreak),
    streakRewards: STREAK_REWARDS.map((reward) => ({
      ...reward,
      claimed: currentStreak >= reward.days,
    })),
  };
}
