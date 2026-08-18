/**
 * Demo story rings for HomeHub — mock until CMS / Supabase stories land.
 * Each ring = several vertical slides (Instagram-style).
 */

export type StorySlide = {
  id: string;
  image: string;
  headline: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  durationMs?: number;
};

export type StoryRing = {
  id: string;
  title: string;
  cover: string;
  isNew?: boolean;
  slides: StorySlide[];
};

const DEFAULT_DURATION_MS = 5200;

export const STORY_RINGS: StoryRing[] = [
  {
    id: "1",
    title: "Путь к 10 раунду",
    cover:
      "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800&q=80",
    isNew: true,
    slides: [
      {
        id: "1a",
        image:
          "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=1200&q=80",
        headline: "Раунд 10 — порог силы",
        body: "Открой топ-тренеров и закрытые сплиты. Фибоначчи не прощает пропусков.",
        durationMs: 5500,
      },
      {
        id: "1b",
        image:
          "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&q=80",
        headline: "Как набрать XP быстрее",
        body: "Стрик 7 дней · сплит · отзыв после боя. Каждая тренировка считает.",
        ctaLabel: "Смотреть раунды",
        ctaHref: "/levels",
      },
    ],
  },
  {
    id: "2",
    title: "Сеть залов",
    cover:
      "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=800&q=80",
    isNew: true,
    slides: [
      {
        id: "2a",
        image:
          "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=1200&q=80",
        headline: "Залы рядом с тобой",
        body: "Утренние слоты 10:00–16:00 — пустые у залов, золотые для тебя.",
        ctaLabel: "Открыть карту",
        ctaHref: "/map",
      },
      {
        id: "2b",
        image:
          "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
        headline: "Сплит на 6 человек",
        body: "Тренер зарабатывает больше, ты платишь меньше. Экономика Round 23.",
        ctaLabel: "Тренироваться",
        ctaHref: "/booking",
      },
    ],
  },
  {
    id: "3",
    title: "Тренировка с Волковым",
    cover:
      "https://images.unsplash.com/photo-1552072805-f9a7be36c5c9?w=800&q=80",
    slides: [
      {
        id: "3a",
        image:
          "https://images.unsplash.com/photo-1552072805-f9a7be36c5c9?w=1200&q=80",
        headline: "MMA · закрытый сплит",
        body: "3 места осталось. Раунд 5+ · цена сплита, уровень индивидуалки.",
        ctaLabel: "Записаться",
        ctaHref: "/trainer/2",
      },
    ],
  },
  {
    id: "4",
    title: "Как работает ELO",
    cover:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
    slides: [
      {
        id: "4a",
        image:
          "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
        headline: "ELO ≠ Таланты",
        body: "Таланты копятся от тренировок. ELO растёт только от побед. Две разные шкалы силы.",
      },
      {
        id: "4b",
        image:
          "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1200&q=80",
        headline: "Warrior Passport",
        body: "Глобальный рейтинг в одном паспорте. Покажи друзьям — пусть зайдут по коду.",
        ctaLabel: "Открыть паспорт",
        ctaHref: "/?tab=passport",
      },
    ],
  },
];

export function getStoryDurationMs(slide: StorySlide): number {
  return slide.durationMs ?? DEFAULT_DURATION_MS;
}

export function findStoryIndex(id: string): number {
  const i = STORY_RINGS.findIndex((r) => r.id === id);
  return i >= 0 ? i : 0;
}
