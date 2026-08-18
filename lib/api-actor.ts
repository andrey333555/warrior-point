/**
 * Authorization gates for privacy / admin APIs.
 * Never trust client-supplied actorId alone — bind to NextAuth session
 * or server-only WARRIOR_ADMIN_SECRET.
 */

import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { resolveWarriorRole, type WarriorRole } from "@/lib/roles";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";
import {
  getApiSessionUserId,
  isDemoEconomyAllowed,
} from "@/lib/api-session";

function sb() {
  return createWarriorServiceClient() ?? createWarriorBrowserClient();
}

/** Server-only admin gate — never NEXT_PUBLIC_*. */
export function isServerAdminSecret(headerValue: string | null | undefined): boolean {
  const secret = process.env.WARRIOR_ADMIN_SECRET?.trim();
  if (!secret || !headerValue) return false;
  return headerValue.trim() === secret;
}

export async function fetchActorRole(
  actorId: string | undefined | null,
): Promise<WarriorRole | null> {
  if (!actorId?.trim()) return null;
  const client = sb();
  if (!client) {
    return actorId === DEMO_FIGHTER_DB_ID ? "fighter" : null;
  }
  const { data } = await client
    .from("profiles")
    .select("role")
    .eq("id", actorId.trim())
    .maybeSingle();
  if (!data) return null;
  return resolveWarriorRole(data.role);
}

/**
 * Resolve the effective actor: session user wins.
 * Demo only: allow claimed actorId when no session.
 */
async function resolveActorId(
  claimedActorId: string | null | undefined,
): Promise<
  | { ok: true; actorId: string }
  | { ok: false; status: number; message: string }
> {
  const sessionId = await getApiSessionUserId();
  const claimed = claimedActorId?.trim() ?? "";

  if (sessionId) {
    if (claimed && claimed !== sessionId) {
      return {
        ok: false,
        status: 403,
        message: "actorId не совпадает с сессией",
      };
    }
    return { ok: true, actorId: sessionId };
  }

  if (isDemoEconomyAllowed() && claimed) {
    return { ok: true, actorId: claimed };
  }

  return {
    ok: false,
    status: 401,
    message: "Нужна авторизация",
  };
}

/**
 * Privacy mutations: only own profile, or real admin (session role / secret).
 */
export async function canEditProfilePrivacy(opts: {
  actorId?: string | null;
  profileId: string;
  adminSecret?: string | null;
}): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const profileId = opts.profileId.trim();
  if (!profileId) {
    return { ok: false, status: 400, message: "profileId обязателен" };
  }

  if (isServerAdminSecret(opts.adminSecret)) {
    return { ok: true };
  }

  const actor = await resolveActorId(opts.actorId);
  if (!actor.ok) return actor;

  if (actor.actorId === profileId) return { ok: true };

  const role = await fetchActorRole(actor.actorId);
  if (role === "admin") return { ok: true };

  return {
    ok: false,
    status: 403,
    message: "Можно менять только свой профиль",
  };
}

export async function canAccessAdmin(opts: {
  actorId?: string | null;
  write?: boolean;
  adminSecret?: string | null;
}): Promise<
  | { ok: true; role: WarriorRole | "secret-admin"; canDelete: boolean }
  | { ok: false; status: number; message: string }
> {
  if (isServerAdminSecret(opts.adminSecret)) {
    return { ok: true, role: "secret-admin", canDelete: true };
  }

  const actor = await resolveActorId(opts.actorId);
  if (!actor.ok) return actor;

  const role = await fetchActorRole(actor.actorId);
  if (role === "admin") {
    return { ok: true, role, canDelete: true };
  }
  if (!opts.write && role === "coach") {
    return { ok: true, role, canDelete: false };
  }

  return {
    ok: false,
    status: 403,
    message: "Нет доступа · нужна роль admin/coach в профиле",
  };
}
