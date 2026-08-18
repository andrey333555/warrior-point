/**
 * Lightweight admin gate for the Warrior Point UI only.
 *
 * Reveals admin chrome when `NEXT_PUBLIC_WARRIOR_ADMIN=1` or `?admin=1`.
 *
 * ⚠️ NOT security. API admin access uses session role or
 * WARRIOR_ADMIN_SECRET — never this flag alone.
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
