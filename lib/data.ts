export type Video = {
  id: string;
  title: string;
  channel: string;
  views: string;
  duration: string;
  thumbnail: string;
  category: string;
  videoUrl: string;
  avatar: string;
  verified: boolean;
  platform?: string;
};

export const CATEGORIES = [
  "Все",
  "MMA",
  "Бокс",
  "BJJ",
  "Борьба",
  "Кикбоксинг",
  "Тренировки",
  "Разборы",
] as const;

export type VideoCategory = (typeof CATEGORIES)[number];

export const VIDEOS: Video[] = [
  {
    id: "1",
    title: "Артём Волков vs. Марчин Тыбура — Полный бой UFC Fight Night",
    channel: "UFC Russia",
    views: "2.4М",
    duration: "25:14",
    thumbnail:
      "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800&q=80",
    category: "MMA",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatar: "https://i.pravatar.cc/40?img=1",
    verified: true,
  },
  {
    id: "2",
    title: "Разбор боя: Хабиб vs Макгрегор — тактика и техника",
    channel: "Fight Analysis",
    views: "1.8М",
    duration: "18:42",
    thumbnail:
      "https://images.unsplash.com/photo-1615117950275-1c8a6ffd6b35?w=800&q=80",
    category: "Разборы",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatar: "https://i.pravatar.cc/40?img=2",
    verified: true,
  },
  {
    id: "3",
    title: "Тренировка по страйкингу с Артёмом Волковым — работа на дистанции",
    channel: "Волков MMA",
    views: "340К",
    duration: "12:05",
    thumbnail:
      "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=800&q=80",
    category: "Тренировки",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatar: "https://i.pravatar.cc/40?img=3",
    verified: false,
  },
  {
    id: "4",
    title: "Ислам Махачев — Чемпион UFC. Путь к вершине",
    channel: "MMA Weekly",
    views: "980К",
    duration: "22:30",
    thumbnail:
      "https://images.unsplash.com/photo-1552072805-f9a7be36c5c9?w=800&q=80",
    category: "MMA",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatar: "https://i.pravatar.cc/40?img=4",
    verified: true,
  },
  {
    id: "5",
    title: "Спарринг BJJ — защита от тейкдаунов. Основы партера",
    channel: "Grappling Pro",
    views: "210К",
    duration: "09:18",
    thumbnail:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
    category: "BJJ",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatar: "https://i.pravatar.cc/40?img=5",
    verified: false,
  },
  {
    id: "6",
    title: "Константин Цзю — Легенда бокса. Лучшие нокауты",
    channel: "Boxing Classics",
    views: "1.2М",
    duration: "15:50",
    thumbnail:
      "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=800&q=80",
    category: "Бокс",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatar: "https://i.pravatar.cc/40?img=6",
    verified: true,
  },
  {
    id: "7",
    title: "Разбор защиты от зала — техника тейкдаун дефенс",
    channel: "Technique Lab",
    views: "88К",
    duration: "11:22",
    thumbnail:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
    category: "Разборы",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatar: "https://i.pravatar.cc/40?img=7",
    verified: false,
  },
];

// ── Gyms (UI catalog · favorites key: "gyms" by name) ───────────────────────

export type GymListing = {
  id: string;
  name: string;
  city: string;
  rating: number;
  members: number;
  image: string;
};

export const GYMS: GymListing[] = [
  {
    id: "tiger-gym",
    name: "Tiger Gym",
    city: "Москва",
    rating: 4.9,
    members: 1200,
    image: "/gym.jpg",
  },
  {
    id: "kuznya-krd-main",
    name: "Кузня · Главный",
    city: "Краснодар",
    rating: 4.8,
    members: 186,
    image: "/gym.jpg",
  },
  {
    id: "iron-will-spb",
    name: "IRON WILL",
    city: "Санкт-Петербург",
    rating: 4.7,
    members: 340,
    image: "/gym.jpg",
  },
];

export function findGymListing(id: string): GymListing | undefined {
  return GYMS.find((g) => g.id === id);
}

export function findGymListingByName(name: string): GymListing | undefined {
  return GYMS.find((g) => g.name === name);
}

// ── Trainers & network (Gym ↔ Trainer ↔ Fighter) ────────────────────────────

export type { TrainingType, Gym, Trainer, Fighter } from "@/lib/network";
export {
  gyms,
  trainers,
  fighters,
  findGym,
  findTrainer,
  findFighter,
  getGymName,
  getGymsForTrainer,
  getTrainersForGym,
  getFightersForGym,
  getFightersForTrainer,
  DEFAULT_TRAINER_IMAGE,
  DEFAULT_FIGHTER_IMAGE,
  DEFAULT_GYM_IMAGE,
  bookingGym,
} from "@/lib/network";

export type ScheduleDate = {
  id: string;
  label: string;
};

export const scheduleDates: ScheduleDate[] = [
  { id: "today", label: "Сегодня" },
  { id: "tomorrow", label: "Завтра" },
  { id: "jun-25", label: "25 июня" },
  { id: "jun-26", label: "26 июня" },
];

export type ScheduleTime = {
  id: string;
  label: string;
};

export const scheduleTimes: ScheduleTime[] = [
  { id: "10-00", label: "10:00" },
  { id: "12-00", label: "12:00" },
  { id: "14-00", label: "14:00" },
  { id: "18-00", label: "18:00" },
];

// ── Booking flow: боец → зал → тренер → сплит → запись ───────────────────

export type InspiredFighter = {
  id: string;
  name: string;
  tag: string;
};

export const inspiredFighter: InspiredFighter = {
  id: "cobra",
  name: "Cobra",
  tag: "Striker · UFC",
};

export const bookingDates = ["Сегодня", "Завтра", "25 июн", "26 июн"] as const;
export const bookingTimes = ["10:00", "12:00", "14:00", "18:00"] as const;
