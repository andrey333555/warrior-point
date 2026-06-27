export type PlanId = "free" | "vip_month" | "vip_year";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  period: string;
  color: string;
  badge: string;
  popular?: boolean;
  savings?: string;
  pricePerMonth?: number;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "навсегда",
    color: "#6b7280",
    badge: "🥊",
  },
  {
    id: "vip_month",
    name: "VIP",
    price: 990,
    period: "/ месяц",
    color: "#C9A84C",
    badge: "⚡",
    popular: true,
  },
  {
    id: "vip_year",
    name: "Элита",
    price: 7990,
    period: "/ год",
    color: "#ef4444",
    badge: "👑",
    savings: "Экономия 33%",
    pricePerMonth: 666,
  },
];

export const VIP_PERKS = [
  {
    icon: "🏆",
    title: "Доступ к легендам",
    desc: "Шлеменко, Перевертунов, Романов — без ограничений по раунду",
    vip: true,
    elite: true,
  },
  {
    icon: "⚡",
    title: "Приоритетная бронь",
    desc: "Записывайся за 24ч до открытия слотов для всех",
    vip: true,
    elite: true,
  },
  {
    icon: "💰",
    title: "Скидка на сплиты",
    desc: "-20% на каждую тренировку · VIP / -25% · Элита",
    vip: true,
    elite: true,
  },
  {
    icon: "🎬",
    title: "Эксклюзивные разборы",
    desc: "Закрытые видео тренеров и разборы топ-боёв",
    vip: true,
    elite: true,
  },
  {
    icon: "🤖",
    title: "AI анализ твоих боёв",
    desc: "Загрузи видео — получи разбор техники от ИИ",
    vip: true,
    elite: true,
  },
  {
    icon: "👑",
    title: "+5 раундов доступа",
    desc: "Попади к тренерам на 5 уровней выше твоего раунда",
    vip: false,
    elite: true,
  },
] as const;

export function splitDiscountPct(planId: PlanId): number {
  if (planId === "vip_year") return 25;
  if (planId === "vip_month") return 20;
  return 0;
}
