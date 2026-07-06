// ── Warrior Point network: Gym ↔ Trainer ↔ Fighter ───────────────────────────

export type Review = {
  id: string;
  userName: string;
  text: string;
  rating: number;
  date: string;
};

export type TrainingType = {
  id: string;
  name: string;
  duration: string;
  price: number;
  fitsYou?: string[];
};

export type Gym = {
  id: number;
  name: string;
  city: string;
  address: string;
  locationHint?: string;
  image?: string;
  note?: string;
  trainers: number[];
  fighters: number[];
  /** Выделенные тренеры — рекомендация зала (не дублирует полный список). */
  recommendedTrainers: number[];
  /** Выделенные бойцы — рекомендация зала. */
  recommendedFighters: number[];
};

export type Trainer = {
  id: number;
  name: string;
  experience: string;
  image?: string;
  bio?: string;
  badge?: string;
  /** Залы, где ведёт тренировки (может быть несколько). */
  gyms: number[];
  /** Подпись зала для UI: «Флагман», «Филиал», … */
  gymLabels?: Record<number, string>;
  fighters: number[];
  trainings: TrainingType[];
  rating: number;
  reviewsCount: number;
  reviews: Review[];
  supportCount: number;
  supportAmount: number;
  subscriptionEnabled?: boolean;
  subscriptionPrice?: number;
  subscriptionSlots?: number;
  currentSubscribers?: number;
};

export type Fighter = {
  id: number;
  name: string;
  city: string;
  record: string;
  elo: number;
  change: number;
  style: string[];
  image?: string;
  trainerId: number;
  gyms: number[];
};

export const DEFAULT_TRAINER_IMAGE =
  "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=900&q=80";

export const DEFAULT_FIGHTER_IMAGE =
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80";

export const DEFAULT_GYM_IMAGE =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a10?w=900&q=80";

const STRIKING_SPLITS: TrainingType[] = [
  { id: "t1", name: "Ударка", duration: "60 мин", price: 1500, fitsYou: ["хочешь улучшить ударку", "готов тренироваться 2-3 раза в неделю"] },
  { id: "t2", name: "Борьба", duration: "60 мин", price: 1700 },
  { id: "t3", name: "Функционал", duration: "45 мин", price: 1200 },
];

export const gyms: Gym[] = [
  {
    id: 1,
    name: "Tiger Gym",
    city: "Global Network",
    address: "Verified partner · main floor",
    locationHint: "5 минут от метро",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a10?w=900&q=80",
    note: "Flagship · ударка и MMA",
    trainers: [1, 2],
    fighters: [1, 2, 3, 4],
    recommendedTrainers: [1],
    recommendedFighters: [3, 5],
  },
  {
    id: 2,
    name: "Sparta Gym",
    city: "Global Network",
    address: "Verified partner · east wing",
    locationHint: "Филиал · 8 мин от центра",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80",
    note: "Грэпплинг · борьба",
    trainers: [1, 3],
    fighters: [5, 6, 7],
    recommendedTrainers: [3],
    recommendedFighters: [5],
  },
  {
    id: 3,
    name: "Octagon Club",
    city: "Global Network",
    address: "Verified partner · pro cage",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80",
    note: "Pro camp · смешанные форматы",
    trainers: [4, 5],
    fighters: [8, 9, 10],
    recommendedTrainers: [4],
    recommendedFighters: [10],
  },
  {
    id: 4,
    name: "Iron Forge",
    city: "Global Network",
    address: "Verified partner · strength lab",
    image: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=900&q=80",
    note: "Сила · подготовка к бою",
    trainers: [6],
    fighters: [11, 12],
    recommendedTrainers: [6],
    recommendedFighters: [11],
  },
  {
    id: 5,
    name: "Warrior Point Lab",
    city: "Global Network",
    address: "HQ · elite roster",
    image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=900&q=80",
    note: "Round 23 · top tier",
    trainers: [7],
    fighters: [13, 14],
    recommendedTrainers: [7],
    recommendedFighters: [14],
  },
];

export const trainers: Trainer[] = [
  {
    id: 1,
    name: "Иван Дроздов",
    experience: "12 лет",
    image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=900&q=80",
    bio: "Помогу поставить удар за 2 месяца. Работаю с нуля и с бойцами.",
    badge: "Мастер спорта",
    gyms: [1, 2],
    gymLabels: { 1: "Флагман", 2: "Филиал" },
    fighters: [1, 2, 3],
    trainings: STRIKING_SPLITS,
    rating: 4.8,
    reviewsCount: 120,
    reviews: [
      { id: "r1-1", userName: "WP.INTL.X9", text: "Поставил удар за 6 недель. Метод работает.", rating: 5, date: "15 июн" },
      { id: "r1-2", userName: "NOVA.KICK", text: "Жёсткий, требовательный. Результат есть.", rating: 5, date: "2 июн" },
      { id: "r1-3", userName: "IRON.FIST", text: "Хорошая база. Хотелось бы больше спаррингов.", rating: 4, date: "20 май" },
    ],
    supportCount: 128,
    supportAmount: 38400,
    subscriptionEnabled: true,
    subscriptionPrice: 7990,
    subscriptionSlots: 20,
    currentSubscribers: 15,
  },
  {
    id: 2,
    name: "Алекс Storm",
    experience: "8 лет",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80",
    bio: "Скорость, комбинации, работа на лапах.",
    badge: "КМС по боксу",
    gyms: [1],
    fighters: [4],
    trainings: [
      { id: "t1", name: "Ударка", duration: "60 мин", price: 1800 },
      { id: "t2", name: "Персональная", duration: "60 мин", price: 3200 },
    ],
    rating: 4.6,
    reviewsCount: 74,
    reviews: [
      { id: "r2-1", userName: "SHADOW.BOX", text: "Скорость выросла заметно за месяц.", rating: 5, date: "10 июн" },
      { id: "r2-2", userName: "BJJ.WOLF", text: "Хорошие комбо, грамотный разбор.", rating: 4, date: "1 июн" },
    ],
    supportCount: 54,
    supportAmount: 16200,
    subscriptionEnabled: true,
    subscriptionPrice: 5990,
    subscriptionSlots: 15,
    currentSubscribers: 11,
  },
  {
    id: 3,
    name: "Мария Grapple",
    experience: "10 лет",
    image: "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=900&q=80",
    bio: "BJJ и борьба — контроль, переводы, удержания.",
    badge: "Чемпионка EU",
    gyms: [2],
    fighters: [5, 6, 7],
    trainings: [
      { id: "t1", name: "Борьба", duration: "60 мин", price: 1600 },
      { id: "t2", name: "BJJ", duration: "90 мин", price: 2000 },
    ],
    rating: 4.9,
    reviewsCount: 95,
    reviews: [
      { id: "r3-1", userName: "GRAPPLER.PRO", text: "Лучший тренер по борьбе из тех, кого пробовал.", rating: 5, date: "18 июн" },
      { id: "r3-2", userName: "MAT.KING", text: "Разобрала все мои слабые места. Прогресс реальный.", rating: 5, date: "7 июн" },
    ],
    supportCount: 91,
    supportAmount: 27300,
    subscriptionEnabled: true,
    subscriptionPrice: 6990,
    subscriptionSlots: 12,
    currentSubscribers: 10,
  },
  {
    id: 4,
    name: "Олег Перов",
    experience: "15 лет",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80",
    bio: "Тренер чемпионов · тактика и game plan.",
    badge: "Основатель сети",
    gyms: [3],
    fighters: [8, 9],
    trainings: STRIKING_SPLITS,
    rating: 4.7,
    reviewsCount: 210,
    reviews: [
      { id: "r4-1", userName: "BJJ.WOLF", text: "Game plan на бой расписал детально. Редкий тренер.", rating: 5, date: "12 июн" },
      { id: "r4-2", userName: "TAKEDOWN.99", text: "Много опыта, умеет передать.", rating: 4, date: "3 июн" },
    ],
    supportCount: 203,
    supportAmount: 60900,
  },
  {
    id: 5,
    name: "Сергей Romanov",
    experience: "14 лет",
    image: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=900&q=80",
    bio: "MMA cage prep · sparring · fight camp.",
    badge: "Pro coach",
    gyms: [3],
    fighters: [10],
    trainings: [
      { id: "t1", name: "MMA", duration: "90 мин", price: 2500 },
      { id: "t2", name: "Sparring", duration: "60 мин", price: 2200 },
    ],
    rating: 4.7,
    reviewsCount: 88,
    reviews: [
      { id: "r5-1", userName: "CHAMP.X", text: "Подготовил к бою за 8 недель. Уровень профи.", rating: 5, date: "14 июн" },
    ],
    supportCount: 67,
    supportAmount: 20100,
  },
  {
    id: 6,
    name: "Viktor Kolesnik",
    experience: "9 лет",
    image: "https://images.unsplash.com/photo-1552072805-f9a7be36c5c9?w=900&q=80",
    bio: "Сила, выносливость, fight conditioning.",
    badge: "S&C specialist",
    gyms: [4],
    fighters: [11, 12],
    trainings: [
      { id: "t1", name: "Функционал", duration: "60 мин", price: 1400 },
      { id: "t2", name: "Сила", duration: "60 мин", price: 1600 },
    ],
    rating: 4.5,
    reviewsCount: 52,
    reviews: [
      { id: "r6-1", userName: "FORGE.HEAVY", text: "Кондиция выросла за 2 месяца. Метод рабочий.", rating: 5, date: "9 июн" },
      { id: "r6-2", userName: "KAZAR.L", text: "Хорошо, но иногда перегружает объёмом.", rating: 4, date: "25 май" },
    ],
    supportCount: 38,
    supportAmount: 11400,
  },
  {
    id: 7,
    name: "Elena Strike",
    experience: "11 лет",
    image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=900&q=80",
    bio: "Elite striking · footwork · distance.",
    badge: "Round 23 coach",
    gyms: [5],
    fighters: [13, 14],
    trainings: [
      { id: "t1", name: "Ударка", duration: "60 мин", price: 3000 },
      { id: "t2", name: "VIP сплит", duration: "90 мин", price: 5000 },
    ],
    rating: 5.0,
    reviewsCount: 47,
    reviews: [
      { id: "r7-1", userName: "ROUND.23", text: "Лучший коуч в сети. Другой уровень.", rating: 5, date: "20 июн" },
      { id: "r7-2", userName: "ELENA.S", text: "Footwork полностью переработала. Топ.", rating: 5, date: "11 июн" },
    ],
    supportCount: 312,
    supportAmount: 93600,
    subscriptionEnabled: true,
    subscriptionPrice: 12990,
    subscriptionSlots: 10,
    currentSubscribers: 9,
  },
];

export const fighters: Fighter[] = [
  { id: 1, name: "WP.INTL.X9", city: "Global", record: "25-3", elo: 2619, change: 29, style: ["Ударка", "Борьба"], trainerId: 1, gyms: [1], image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=900&q=80" },
  { id: 2, name: "NOVA.KICK", city: "Global", record: "14-2", elo: 2380, change: 18, style: ["Ударка"], trainerId: 1, gyms: [1], image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80" },
  { id: 3, name: "SHADOW.BOX", city: "Global", record: "11-4", elo: 2210, change: 8, style: ["Ударка"], trainerId: 1, gyms: [1] },
  { id: 4, name: "IRON.FIST", city: "Global", record: "18-2", elo: 2490, change: 12, style: ["Ударка"], trainerId: 2, gyms: [1], image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80" },
  { id: 5, name: "GRAPPLER.PRO", city: "Global", record: "30-5", elo: 2450, change: -5, style: ["Борьба"], trainerId: 3, gyms: [2], image: "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=900&q=80" },
  { id: 6, name: "MAT.KING", city: "Global", record: "22-6", elo: 2310, change: 14, style: ["BJJ"], trainerId: 3, gyms: [2] },
  { id: 7, name: "STRIKE.ONE", city: "Global", record: "9-1", elo: 2180, change: 22, style: ["Ударка", "BJJ"], trainerId: 3, gyms: [2] },
  { id: 8, name: "BJJ.WOLF", city: "Global", record: "16-3", elo: 2420, change: 11, style: ["BJJ"], trainerId: 4, gyms: [3] },
  { id: 9, name: "TAKEDOWN.99", city: "Global", record: "20-4", elo: 2350, change: 7, style: ["Борьба"], trainerId: 4, gyms: [3] },
  { id: 10, name: "CHAMP.X", city: "Global", record: "27-2", elo: 2550, change: 19, style: ["MMA"], trainerId: 5, gyms: [3], image: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=900&q=80" },
  { id: 11, name: "FORGE.HEAVY", city: "Global", record: "12-2", elo: 2280, change: 9, style: ["Сила"], trainerId: 6, gyms: [4] },
  { id: 12, name: "KAZAR.L", city: "Global", record: "15-5", elo: 2190, change: 4, style: ["Функционал"], trainerId: 6, gyms: [4] },
  { id: 13, name: "ELENA.S", city: "Global", record: "19-1", elo: 2520, change: 25, style: ["Ударка"], trainerId: 7, gyms: [5] },
  { id: 14, name: "ROUND.23", city: "Global", record: "31-0", elo: 2680, change: 31, style: ["MMA", "Ударка"], trainerId: 7, gyms: [5], image: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=900&q=80" },
];

// ── Lookups ───────────────────────────────────────────────────────────────────

export function parseNetworkId(id: string): number | null {
  const n = Number.parseInt(id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function findGym(id: number): Gym | undefined {
  return gyms.find((g) => g.id === id);
}

export function findTrainer(id: string | number): Trainer | undefined {
  const n = typeof id === "number" ? id : parseNetworkId(id);
  if (n == null) return undefined;
  return trainers.find((t) => t.id === n);
}

export function findFighter(id: number): Fighter | undefined {
  return fighters.find((f) => f.id === id);
}

export function getGymLabelForTrainer(trainer: Trainer, gymId: number): string {
  return trainer.gymLabels?.[gymId] ?? findGym(gymId)?.note ?? "Зал";
}

export function getGymName(id: number): string {
  return findGym(id)?.name ?? "Зал";
}

export function getTrainerName(id: number): string {
  return findTrainer(id)?.name ?? "Тренер";
}

export function getGymsForTrainer(trainerId: number): Gym[] {
  const trainer = findTrainer(trainerId);
  if (!trainer) return [];
  return trainer.gyms.map((gid) => findGym(gid)).filter((g): g is Gym => !!g);
}

export function getTrainersForGym(gymId: number): Trainer[] {
  const gym = findGym(gymId);
  if (!gym) return [];
  return gym.trainers.map((tid) => findTrainer(tid)).filter((t): t is Trainer => !!t);
}

export function getFightersForGym(gymId: number): Fighter[] {
  const gym = findGym(gymId);
  if (!gym) return [];
  return gym.fighters.map((fid) => findFighter(fid)).filter((f): f is Fighter => !!f);
}

export function getRecommendedTrainersForGym(gymId: number): Trainer[] {
  const gym = findGym(gymId);
  if (!gym) return [];
  return gym.recommendedTrainers
    .map((tid) => findTrainer(tid))
    .filter((t): t is Trainer => !!t);
}

export function getRecommendedFightersForGym(gymId: number): Fighter[] {
  const gym = findGym(gymId);
  if (!gym) return [];
  return gym.recommendedFighters
    .map((fid) => findFighter(fid))
    .filter((f): f is Fighter => !!f);
}

export function getFightersForTrainer(trainerId: number): Fighter[] {
  const trainer = findTrainer(trainerId);
  if (!trainer) return [];
  return trainer.fighters.map((fid) => findFighter(fid)).filter((f): f is Fighter => !!f);
}

export const bookingGym = { id: 1, name: "Tiger Gym" };
