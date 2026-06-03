/**
 * Warrior Point — Gym registry for the Krasnodar region.
 *
 * Coordinates: WGS-84 [lat, lng].
 *
 * ── Categories ──────────────────────────────────────────────────────────────
 *   "kuznya"      — клуб «Кузня»  (10 филиалов, cyan)
 *   "fight_club"  — бойцовские залы MMA / Ударные / Грэпплинг (cyan)
 *   "wrestling"   — борцовские залы Вольная/Греко-римская/Самбо/Дзюдо (fuchsia)
 *   "partner_slot"— партнёрские клубы TBD (Нарт, Бульдог, Самсон, Кикбоксинг)
 *
 * ── Networks ─────────────────────────────────────────────────────────────────
 *   "kuznya" | "nart" | "bulldog" | "samson" | "kickbox" | "independent"
 */

// ── Type definitions ─────────────────────────────────────────────────────────

export type GymCategory =
  | "kuznya"
  | "fight_club"
  | "wrestling"
  | "partner_slot";

export type NetworkTier =
  | "kuznya"
  | "nart"
  | "bulldog"
  | "samson"
  | "kickbox"
  | "independent";

export type FeaturedAthlete = {
  /** Matches profiles.id */
  profileId: string;
  displayName: string;
  /** e.g. "MMA · Featherweight" */
  label: string;
  /** 'Pro' | 'Amateur' | 'Coach' */
  status: string;
};

export type GymEntry = {
  id: string;
  name: string;
  category: GymCategory;
  network: NetworkTier;
  city: string;
  address: string;
  lat: number;
  lng: number;
  coachId: string;
  coachName: string;
  /** Martial arts disciplines offered. */
  specializations: string[];
  /** Key athletes / trainers to feature in the map popup. */
  featuredAthletes?: FeaturedAthlete[];
  phone?: string;
  instagram?: string;
  website?: string;
  accent: "cyan" | "fuchsia" | "amber" | "emerald" | "violet" | "rose";
  /** true = no coordinates yet, skip map placement. */
  pending?: boolean;
};

// ── Клуб «Кузня» — 10 официальных филиалов ──────────────────────────────────

const KUZNYA_GYMS: GymEntry[] = [
  {
    id: "kuznya-krd-main",
    name: "Кузня · Главный",
    category: "kuznya",
    network: "kuznya",
    city: "Краснодар",
    address: "ул. Академика Павлова, 64",
    lat: 45.0108,
    lng: 38.9453,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA", "Кикбоксинг", "Бокс"],
    featuredAthletes: [
      {
        profileId: "WP-INTL-X9-441K",
        displayName: "Виктор Колесник",
        label: "MMA · Featherweight",
        status: "Pro",
      },
    ],
    instagram: "@kuznya_krd",
    accent: "cyan",
  },
  {
    id: "kuznya-krd-pamirskaya",
    name: "Кузня · Памирская",
    category: "kuznya",
    network: "kuznya",
    city: "Краснодар",
    address: "ул. Памирская, 31",
    lat: 45.0643,
    lng: 39.0015,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA", "Кикбоксинг"],
    accent: "cyan",
  },
  {
    id: "kuznya-belozerniy",
    name: "Кузня · Белозерный",
    category: "kuznya",
    network: "kuznya",
    city: "пос. Белозерный",
    address: "пос. Белозерный, Краснодарский край",
    lat: 45.1320,
    lng: 38.9145,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA", "ОФП"],
    accent: "cyan",
  },
  {
    id: "kuznya-anapa",
    name: "Кузня · Анапа",
    category: "kuznya",
    network: "kuznya",
    city: "Анапа",
    address: "ул. Шевченко, 24",
    lat: 44.8932,
    lng: 37.3187,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA", "Кикбоксинг", "Тайский бокс"],
    featuredAthletes: [
      {
        profileId: "WP-INTL-X9-441K",
        displayName: "Виктор Колесник",
        label: "MMA · Featherweight · 66 кг",
        status: "Pro",
      },
    ],
    instagram: "@kuznya_anapa",
    accent: "emerald",
  },
  {
    id: "kuznya-sevastopol",
    name: "Кузня · Севастополь",
    category: "kuznya",
    network: "kuznya",
    city: "Севастополь",
    address: "пр. Генерала Острякова, 65А",
    lat: 44.5764,
    lng: 33.4803,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA", "Бокс"],
    accent: "fuchsia",
  },
  {
    id: "kuznya-ust-labinsk",
    name: "Кузня · Усть-Лабинск",
    category: "kuznya",
    network: "kuznya",
    city: "Усть-Лабинск",
    address: "ул. Ленина, 66",
    lat: 45.2245,
    lng: 39.6871,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA", "Кикбоксинг"],
    accent: "cyan",
  },
  {
    id: "kuznya-kholmskaya",
    name: "Кузня · Холмская",
    category: "kuznya",
    network: "kuznya",
    city: "ст. Холмская",
    address: "ст. Холмская, Краснодарский край",
    lat: 44.8910,
    lng: 38.1523,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA", "Ударные"],
    accent: "amber",
  },
  {
    id: "kuznya-raevskaya",
    name: "Кузня · Раевская",
    category: "kuznya",
    network: "kuznya",
    city: "ст. Раевская",
    address: "ул. Островского, 16",
    lat: 44.7754,
    lng: 37.6861,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA"],
    accent: "amber",
  },
  {
    id: "kuznya-natukhaevskaya",
    name: "Кузня · Натухаевская",
    category: "kuznya",
    network: "kuznya",
    city: "ст. Натухаевская",
    address: "ул. Красная, 66",
    lat: 44.8618,
    lng: 37.5497,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA", "Борьба"],
    accent: "amber",
  },
  {
    id: "kuznya-trudobelikovskiy",
    name: "Кузня · Трудобеликовский",
    category: "kuznya",
    network: "kuznya",
    city: "х. Трудобеликовский",
    address: "ул. Ленина, 17",
    lat: 45.2810,
    lng: 38.5593,
    coachId: "WP-COACH-001",
    coachName: "Сергей Романов",
    specializations: ["MMA"],
    accent: "cyan",
  },
];

// ── Бойцовские клубы (MMA · Ударные · Грэпплинг) ────────────────────────────

const FIGHT_CLUBS: GymEntry[] = [
  {
    id: "fight-lider-krd",
    name: "БК «Лидер» (Fight Leader)",
    category: "fight_club",
    network: "independent",
    city: "Краснодар",
    address: "ул. Академика Лукьяненко, 109",
    lat: 45.0268,
    lng: 38.9834,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["MMA", "Боевое самбо", "Рукопашный бой", "Вольная борьба"],
    accent: "cyan",
  },
  {
    id: "fight-sever-krd",
    name: "БК «СЕВЕР»",
    category: "fight_club",
    network: "independent",
    city: "Краснодар",
    address: "ул. Архитектора Ишунина, 7/1, корп. 2",
    lat: 45.0891,
    lng: 38.9955,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["MMA", "Бокс", "Джиу-джитсу", "Вольная борьба"],
    accent: "cyan",
  },
  {
    id: "fight-kordon-krd",
    name: "Kordon Fight Club",
    category: "fight_club",
    network: "independent",
    city: "Краснодар",
    address: "Яснополянская ул., 22",
    lat: 45.0194,
    lng: 39.0413,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["Комплексные единоборства", "Бокс", "MMA"],
    accent: "cyan",
  },
  {
    id: "fight-chernomor-nvr",
    name: "БК «ЧЕРНОМОР»",
    category: "fight_club",
    network: "independent",
    city: "Новороссийск",
    address: "Анапское шоссе, 15Б, корп. 2",
    lat: 44.7392,
    lng: 37.7758,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["MMA", "Панкратион", "Грэпплинг", "Бокс", "Тайский бокс"],
    accent: "cyan",
  },
  {
    id: "fight-uragan-nvr",
    name: "Клуб «URAGAN»",
    category: "fight_club",
    network: "independent",
    city: "Новороссийск",
    address: "ул. Видова, 109",
    lat: 44.7136,
    lng: 37.7851,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["Муай-тай", "К-1", "Классический бокс"],
    accent: "cyan",
  },
];

// ── Борцовские залы (Вольная · Греко-римская · Самбо · Дзюдо) ───────────────

const WRESTLING_GYMS: GymEntry[] = [
  {
    id: "wrestling-cop-krd",
    name: "ЦОП по спортивной борьбе",
    category: "wrestling",
    network: "independent",
    city: "Краснодар",
    address: "Железнодорожная ул., 49",
    lat: 45.0314,
    lng: 38.9884,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["Вольная борьба", "Греко-римская борьба", "Олимпийский резерв"],
    accent: "fuchsia",
  },
  {
    id: "wrestling-sambo-kuban-krd",
    name: "СК «Самбо Кубань»",
    category: "wrestling",
    network: "independent",
    city: "Краснодар",
    address: "ул. Трудовой Славы, 62а",
    lat: 45.0157,
    lng: 39.0091,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["Спортивное самбо", "Боевое самбо", "Дзюдо"],
    accent: "fuchsia",
  },
  {
    id: "wrestling-peresvet-severnaya",
    name: "СК «Пересвет»",
    category: "wrestling",
    network: "independent",
    city: "ст. Северская",
    address: "ул. Ленина, 125",
    lat: 44.8535,
    lng: 38.8412,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["Вольная борьба", "ОФП", "Единоборства"],
    accent: "fuchsia",
  },
  {
    id: "wrestling-sshor-armavir",
    name: "СШОР по спортивной борьбе",
    category: "wrestling",
    network: "independent",
    city: "Армавир",
    address: "ул. Свердлова, 174",
    lat: 44.9878,
    lng: 41.1267,
    coachId: "",
    coachName: "Уточняется",
    specializations: ["Самбо", "Дзюдо", "Классическая борьба"],
    accent: "fuchsia",
  },
];

// ── Партнёрские клубы — слоты TBD ────────────────────────────────────────────

const PARTNER_SLOTS: GymEntry[] = [
  {
    id: "nart-slot-01",
    name: "Нарт",
    category: "partner_slot",
    network: "nart",
    city: "TBD",
    address: "Локация уточняется",
    lat: 0,
    lng: 0,
    coachId: "",
    coachName: "Уточняется",
    specializations: [],
    accent: "violet",
    pending: true,
  },
  {
    id: "bulldog-slot-01",
    name: "Бульдог",
    category: "partner_slot",
    network: "bulldog",
    city: "TBD",
    address: "Локация уточняется",
    lat: 0,
    lng: 0,
    coachId: "",
    coachName: "Уточняется",
    specializations: [],
    accent: "rose",
    pending: true,
  },
  {
    id: "samson-slot-01",
    name: "Самсон",
    category: "partner_slot",
    network: "samson",
    city: "TBD",
    address: "Локация уточняется",
    lat: 0,
    lng: 0,
    coachId: "",
    coachName: "Уточняется",
    specializations: [],
    accent: "amber",
    pending: true,
  },
  {
    id: "kickbox-fed-slot-01",
    name: "Федерация кикбоксинга",
    category: "partner_slot",
    network: "kickbox",
    city: "TBD",
    address: "Локация уточняется",
    lat: 0,
    lng: 0,
    coachId: "",
    coachName: "Уточняется",
    specializations: [],
    accent: "fuchsia",
    pending: true,
  },
];

// ── Public exports ────────────────────────────────────────────────────────────

/** Full registry — all entries including pending slots. */
export const GYMS: readonly GymEntry[] = [
  ...KUZNYA_GYMS,
  ...FIGHT_CLUBS,
  ...WRESTLING_GYMS,
  ...PARTNER_SLOTS,
] as const;

/** Gyms with real coordinates (safe to render on map). */
export const ACTIVE_GYMS: readonly GymEntry[] = GYMS.filter((g) => !g.pending);

/** Partner placeholder slots (no coordinates). */
export const PENDING_SLOTS: readonly GymEntry[] = GYMS.filter((g) => g.pending);

/** Unique sorted city list from active gyms. */
export const GYM_CITIES: readonly string[] = [
  ...new Set(ACTIVE_GYMS.map((g) => g.city)),
].sort((a, b) => a.localeCompare(b, "ru"));

// ── Labels & colours ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<GymCategory, string> = {
  kuznya:       "Кузня",
  fight_club:   "Бойцовские",
  wrestling:    "Борцовские",
  partner_slot: "Партнёры",
};

export const CATEGORY_ACCENT_HEX: Record<GymCategory, string> = {
  kuznya:       "#22d3ee",  // cyan
  fight_club:   "#22d3ee",  // cyan
  wrestling:    "#e879f9",  // fuchsia / magenta
  partner_slot: "#a78bfa",  // violet
};

export const NETWORK_LABELS: Record<NetworkTier, string> = {
  kuznya:      "Кузня",
  nart:        "Нарт",
  bulldog:     "Бульдог",
  samson:      "Самсон",
  kickbox:     "Федерация кикбоксинга",
  independent: "Независимый",
};

export const GYM_ACCENT_HEX: Record<GymEntry["accent"], string> = {
  cyan:    "#22d3ee",
  fuchsia: "#e879f9",
  amber:   "#facc15",
  emerald: "#34d399",
  violet:  "#a78bfa",
  rose:    "#fb7185",
};

// ── Filter helper ─────────────────────────────────────────────────────────────

export type GymFilter = {
  /** null = all categories */
  category: GymCategory | null;
  /** null = all cities */
  city: string | null;
};

export function filterGyms(
  gyms: readonly GymEntry[],
  filter: GymFilter,
): GymEntry[] {
  return gyms.filter((g) => {
    if (g.pending) return false;
    if (filter.category && g.category !== filter.category) return false;
    if (filter.city && g.city !== filter.city) return false;
    return true;
  }) as GymEntry[];
}

/** Find a gym by id. */
export function findGym(id: string): GymEntry | undefined {
  return GYMS.find((g) => g.id === id);
}
