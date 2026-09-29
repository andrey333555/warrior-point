"use client";

import type { WarriorRole } from "@/lib/roles";
import { resolveWarriorRole } from "@/lib/roles";

/**
 * Own role + balance + display name through the server route
 * (`/api/profile/me`). The server binds the read to the authenticated
 * session (or demo actor), so the browser anon key never has to read
 * `profiles.role`/`balance`/`display_name` directly — anon has zero grants
 * on the base `profiles` table now (see migration 0023_fix_rls_lockdown.sql).
 */
export async function fetchOwnProfileMe(
  actorId: string,
): Promise<{ role: WarriorRole; balance: number; displayName: string | null } | null> {
  try {
    const res = await fetch(`/api/profile/me?actorId=${encodeURIComponent(actorId)}`);
    const data = (await res.json()) as {
      ok: boolean;
      role?: unknown;
      balance?: unknown;
      displayName?: unknown;
    };
    if (!data.ok) return null;
    return {
      role: resolveWarriorRole(data.role),
      balance: Number(data.balance) || 0,
      displayName: typeof data.displayName === "string" ? data.displayName : null,
    };
  } catch {
    return null;
  }
}
