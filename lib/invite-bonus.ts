/**
 * Pending signup bonus — survives the jump «попап инвайта → регистрация».
 *
 * Plain string keys (not the `wp.*` JSON registry): the value is read right
 * after redirect, before any store module is initialised.
 */

export const PENDING_INVITE_CODE_KEY = "pending_invite_code";
export const PENDING_BONUS_AMOUNT_KEY = "pending_bonus_amount";

export type PendingBonus = {
  code: string;
  amount: number;
};

export function savePendingBonus(code: string, amount: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_INVITE_CODE_KEY, code);
    localStorage.setItem(PENDING_BONUS_AMOUNT_KEY, String(amount));
  } catch {
    // Private mode / quota — bonus is re-derivable from the ?invite= param.
  }
}

export function getPendingBonus(): PendingBonus | null {
  if (typeof window === "undefined") return null;
  try {
    const code = localStorage.getItem(PENDING_INVITE_CODE_KEY)?.trim();
    if (!code) return null;
    return { code, amount: clampBonus(localStorage.getItem(PENDING_BONUS_AMOUNT_KEY)) };
  } catch {
    return null;
  }
}

export function clearPendingBonus(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_INVITE_CODE_KEY);
    localStorage.removeItem(PENDING_BONUS_AMOUNT_KEY);
  } catch {
    // ignore
  }
}

/** Display only — the credited amount always comes from the server. */
export function clampBonus(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return 300;
  return Math.min(5000, Math.round(n));
}

/** Registration lives on /login (AuthView has both login and register modes). */
export function buildRegisterUrl(code: string, amount: number): string {
  const params = new URLSearchParams({
    invite: code,
    bonus: String(amount),
  });
  return `/login?${params.toString()}`;
}
