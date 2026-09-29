/**
 * Shared helpers for binding API actions to the authenticated user.
 * Never trust client-supplied fighterId/donorId/clientId alone in production.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type BoundUser =
  | { ok: true; userId: string }
  | { ok: false; status: number; message: string };

/** True when demo economy bypasses are allowed (local / staging). */
export function isDemoEconomyAllowed(): boolean {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_ECONOMY !== "1") {
    return false;
  }
  return (
    process.env.ALLOW_DEMO_ECONOMY === "1" ||
    process.env.NODE_ENV === "development"
  );
}

/**
 * Production with real money: unpaid guest tips and free XP mint must die.
 * Set LIVE_ECONOMY_LOCK=1 on Vercel production. Also implied by production
 * without ALLOW_DEMO_ECONOMY=1.
 */
export function isLiveEconomyLocked(): boolean {
  return (
    process.env.LIVE_ECONOMY_LOCK === "1" ||
    (process.env.NODE_ENV === "production" &&
      process.env.ALLOW_DEMO_ECONOMY !== "1")
  );
}

/** Mock YooKassa / free-succeed paths. Never in production. */
export function isMockPaymentsAllowed(): boolean {
  if (isLiveEconomyLocked()) return false;
  if (process.env.NODE_ENV === "production") return false;
  return isDemoEconomyAllowed();
}

/** NextAuth session user id (OAuth sub / telegram id / …). */
export async function getApiSessionUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const id = session?.user?.id?.trim();
    return id || null;
  } catch {
    return null;
  }
}

/**
 * Bind claimedId to session.
 * - With session: claimed must match (or claimed empty → use session).
 * - Without session: only if demo economy allowed AND claimedId provided.
 * - Live lock without session: always 401.
 */
export async function requireBoundUserId(
  claimedId: string | null | undefined,
): Promise<BoundUser> {
  const claimed = typeof claimedId === "string" ? claimedId.trim() : "";
  const sessionId = await getApiSessionUserId();

  if (sessionId) {
    if (claimed && claimed !== sessionId) {
      return {
        ok: false,
        status: 403,
        message: "ID не совпадает с сессией",
      };
    }
    return { ok: true, userId: sessionId };
  }

  if (isLiveEconomyLocked()) {
    return {
      ok: false,
      status: 401,
      message: "Нужна авторизация",
    };
  }

  if (isDemoEconomyAllowed() && claimed) {
    return { ok: true, userId: claimed };
  }

  return {
    ok: false,
    status: 401,
    message: "Нужна авторизация",
  };
}
