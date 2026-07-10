import { loadData, saveData, STORAGE_KEYS } from "@/lib/storage";

// ═══════════════════════════════════════════════════════════════
// Тиры реферальной программы
// ═══════════════════════════════════════════════════════════════

export type ReferralTier = {
  friends: number;
  title: string;
  badge: string;
  yourBonus: number;
};

export const REFERRAL_TIERS: ReferralTier[] = [
  { friends: 0, title: "Разведчик", badge: "🎯", yourBonus: 300 },
  { friends: 3, title: "Рекрутер", badge: "⚡", yourBonus: 300 },
  { friends: 10, title: "Амбассадор", badge: "🏆", yourBonus: 500 },
  { friends: 25, title: "Легенда", badge: "👑", yourBonus: 1000 },
];

export type ReferralData = {
  referralCode: string;
  totalInvited: number;
  activeReferrals: number;
  totalEarned: number;
  pendingBonus: number;
  tier: ReferralTier;
};

export type ReferralFriend = {
  id: string;
  name: string;
  status: "pending" | "active" | "trained";
  earned: number;
  date: string;
  avatar: string;
};

export type ReferralState = {
  referralCode: string;
  handle: string;
  friends: ReferralFriend[];
  totalEarned: number;
  pendingBonus: number;
};

const DEFAULT_HANDLE = "COBRA";
const DEFAULT_BASE_URL = "https://warrior-point.vercel.app";

// ═══════════════════════════════════════════════════════════════
// Коды и ссылки
// ═══════════════════════════════════════════════════════════════

export function generateReferralCode(handle: string): string {
  const clean = handle.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const suffix = Math.abs(hashString(handle)) % 10000;
  return `${clean.slice(0, 5) || "WARRIOR"}-${suffix.toString().padStart(4, "0")}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function buildReferralLink(
  code: string,
  baseUrl = DEFAULT_BASE_URL,
): string {
  const url = new URL("/", baseUrl);
  url.searchParams.set("ref", code);
  return url.toString();
}

export function getShareText(referralCode: string, _handle?: string): string {
  return (
    `Вступай в Round 23 — тренируйся с лучшими тренерами 🥊\n` +
    `Мой код: ${referralCode}\n` +
    `Получи 300₽ на первую тренировку`
  );
}

export function getShareLinks(
  referralCode: string,
  handle?: string,
  baseUrl?: string,
): {
  copy: string;
  telegram: string;
  whatsapp: string;
  vk: string;
} {
  const origin =
    baseUrl ??
    (typeof window !== "undefined"
      ? window.location.origin
      : DEFAULT_BASE_URL);
  const link = buildReferralLink(referralCode, origin);
  const text = getShareText(referralCode, handle);

  return {
    copy: link,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`,
    vk: `https://vk.com/share.php?url=${encodeURIComponent(link)}&title=${encodeURIComponent(text)}`,
  };
}

export function parseReferralFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("ref");
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Тиры и статистика
// ═══════════════════════════════════════════════════════════════

export function getReferralTier(inviteCount: number): ReferralTier {
  let tier = REFERRAL_TIERS[0];
  for (const t of REFERRAL_TIERS) {
    if (inviteCount >= t.friends) tier = t;
  }
  return tier;
}

export function getNextTierProgress(totalInvited: number): {
  current: ReferralTier;
  next: ReferralTier | null;
  progress: number;
  friendsNeeded: number;
} {
  const current = getReferralTier(totalInvited);
  const next =
    REFERRAL_TIERS.find((t) => t.friends > totalInvited) ?? null;

  if (!next) {
    return { current, next: null, progress: 100, friendsNeeded: 0 };
  }

  const span = next.friends - current.friends;
  const done = totalInvited - current.friends;
  const progress = Math.min(100, Math.round((done / span) * 100));
  const friendsNeeded = next.friends - totalInvited;

  return { current, next, progress, friendsNeeded };
}

export function toReferralData(state: ReferralState): ReferralData {
  const totalInvited = state.friends.length;
  const activeReferrals = state.friends.filter(
    (f) => f.status === "active" || f.status === "trained",
  ).length;

  return {
    referralCode: state.referralCode,
    totalInvited,
    activeReferrals,
    totalEarned: state.totalEarned,
    pendingBonus: state.pendingBonus,
    tier: getReferralTier(totalInvited),
  };
}

// ═══════════════════════════════════════════════════════════════
// Storage
// ═══════════════════════════════════════════════════════════════

const SEED_FRIENDS: ReferralFriend[] = [
  {
    id: "rf-1",
    name: "Алексей С.",
    status: "active",
    earned: 300,
    date: "2 дня назад",
    avatar: "🥊",
  },
  {
    id: "rf-2",
    name: "Дмитрий К.",
    status: "active",
    earned: 400,
    date: "5 дней назад",
    avatar: "💪",
  },
  {
    id: "rf-3",
    name: "Мария В.",
    status: "active",
    earned: 300,
    date: "1 неделю назад",
    avatar: "⚡",
  },
  {
    id: "rf-4",
    name: "Игорь П.",
    status: "pending",
    earned: 0,
    date: "Вчера",
    avatar: "🆕",
  },
];

function defaultState(): ReferralState {
  const handle = DEFAULT_HANDLE;
  const referralCode = generateReferralCode(handle);

  return {
    referralCode,
    handle,
    friends: SEED_FRIENDS,
    totalEarned: 1200,
    pendingBonus: 300,
  };
}

export function getReferralState(): ReferralState {
  return loadData<ReferralState>(STORAGE_KEYS.referral, defaultState());
}

export function saveReferralState(state: ReferralState): void {
  saveData(STORAGE_KEYS.referral, state);
}
