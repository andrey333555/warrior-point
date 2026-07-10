// Спортивная страховка Round 23
// 199₽ за тренировку · выплата за 72 часа при травме

export type InsurancePlan = {
  id: string;
  name: string;
  price: number;
  coverage: number;
  payoutHours: number;
  covers: string[];
  notCovers: string[];
};

export type InsuranceClaim = {
  id: string;
  userId: string;
  sessionId: string;
  trainerId: string;
  gymId: string;
  injuryType: string;
  description: string;
  photoUrl?: string;
  status: "pending" | "approved" | "rejected" | "paid";
  amount: number;
  createdAt: string;
  resolvedAt?: string;
};

export const INSURANCE_PLANS: InsurancePlan[] = [
  {
    id: "basic",
    name: "Базовая",
    price: 199,
    coverage: 30_000,
    payoutHours: 72,
    covers: [
      "Ушибы и растяжения",
      "Вывихи",
      "Переломы",
      "Рассечения",
    ],
    notCovers: [
      "Хронические травмы",
      "Травмы до тренировки",
      "Умышленные травмы",
    ],
  },
  {
    id: "pro",
    name: "Про",
    price: 399,
    coverage: 100_000,
    payoutHours: 48,
    covers: [
      "Всё из базовой",
      "Сотрясение мозга",
      "Повреждение связок",
      "Госпитализация",
      "Скорая помощь",
    ],
    notCovers: [
      "Хронические заболевания",
      "Травмы вне зала",
    ],
  },
];

export const INJURY_PAYOUTS: Record<string, number> = {
  Ушиб: 0.05,
  Растяжение: 0.1,
  Рассечение: 0.08,
  Вывих: 0.15,
  Перелом: 0.4,
  Сотрясение: 0.3,
  "Повреждение связок": 0.5,
  Госпитализация: 0.8,
};

export function calculatePayout(plan: InsurancePlan, injuryType: string): number {
  const rate = INJURY_PAYOUTS[injuryType] ?? 0.05;
  return Math.round(plan.coverage * rate);
}

export function calculateInsuranceRevenue(
  totalInsured: number,
  planPrice: number,
  claimRate = 0.03,
  avgPayoutRate = 0.1,
  coverage = 30_000,
): { revenue: number; payouts: number; profit: number; margin: number } {
  const revenue = totalInsured * planPrice;
  const claims = Math.round(totalInsured * claimRate);
  const payouts = claims * Math.round(coverage * avgPayoutRate);
  const profit = revenue - payouts;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  return { revenue, payouts, profit, margin };
}
