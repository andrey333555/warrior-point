/**
 * Lightweight admin gate for the Warrior Point UI.
 *
 * Reveals admin-only affordances (e.g. the gold Gift toggle) when either:
 *   • `NEXT_PUBLIC_WARRIOR_ADMIN=1` is baked into the build, or
 *   • the current URL carries `?admin=1` (great for staging / mobile testing).
 *
 * NOTE: This is a *UI* gate only. All mutations must still be guarded by
 * Supabase row-level security / proper auth in production.
 */
export function isWarriorAdminMode(): boolean {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("admin");

    if (flag === "1") return true;
    if (flag === "0") return false;
  }

  return process.env.NEXT_PUBLIC_WARRIOR_ADMIN === "1";
}

export const WARRIOR_WINNER_STATUS = "Winner of the Month" as const;

export function currentWinnerPeriod(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${y}-${m}`;
}
