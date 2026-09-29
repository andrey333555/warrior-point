"use client";

import type { WarriorRole } from "@/lib/roles";
import { resolveWarriorRole } from "@/lib/roles";

/**
 * Own role + balance through the server route (`/api/profile/me`).
 * The server binds the read to the authenticated session (or demo actor),
 * so the browser anon key never has to read `profiles.role`/`balance`
 * directly — those columns aren't anon-selectable any more (see migration
 * 0023).
 */
export async function fetchOwnProfileMe(
  actorId: string,
): Promise<{ role: WarriorRole; balance: number } | null> {
  try {
    const res = await fetch(`/api/profile/me?actorId=${encodeURIComponent(actorId)}`);
    const data = (await res.json()) as {
      ok: boolean;
      role?: unknown;
      balance?: unknown;
    };
    if (!data.ok) return null;
    return {
      role: resolveWarriorRole(data.role),
      balance: Number(data.balance) || 0,
    };
  } catch {
    return null;
  }
}
