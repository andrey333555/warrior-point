/**
 * Centralized localStorage helpers used by all store modules.
 * Every store can import saveData/loadData instead of duplicating try/catch boilerplate.
 */

// ── Primitives ────────────────────────────────────────────────────────────────

export function saveData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    // Quota exceeded or serialisation error — fail silently in mock
    if (process.env.NODE_ENV === "development") {
      console.warn(`[storage] saveData("${key}") failed:`, err);
    }
  }
}

export function loadData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[storage] loadData("${key}") failed:`, err);
    }
    return fallback;
  }
}

export function removeData(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

// ── Storage keys registry ─────────────────────────────────────────────────────
// Single source of truth — prevents key collisions across modules.

export const STORAGE_KEYS = {
  bookings:      "wp.bookings.v1",
  xp:            "wp.xp.v1",
  reviews:       "wp.reviews.v1",
  goals:         "wp.goals.v1",
  subscriptions: "wp.subscriptions.v1",
  donations:     "wp.donations.v1",
  guestDonor:    "wp.guest-donor.v1",
} as const;

// ── Debug util ────────────────────────────────────────────────────────────────

/** Returns a snapshot of all WP keys in localStorage — useful for dev debugging. */
export function dumpStore(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const result: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("wp.")) {
      result[key] = loadData(key, null);
    }
  }
  return result;
}

/** Wipes all WP keys from localStorage (dev / reset). */
export function clearStore(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("wp.")) keys.push(key);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
}
