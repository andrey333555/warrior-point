import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { resolveWarriorRole, type WarriorRole } from "@/lib/roles";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

function sb() {
  return createWarriorServiceClient() ?? createWarriorBrowserClient();
}

/** Env bake-in only — not the spoofable `?admin=1` query. */
export function isEnvAdminGate(): boolean {
  return process.env.NEXT_PUBLIC_WARRIOR_ADMIN === "1";
}

export async function fetchActorRole(
  actorId: string | undefined | null,
): Promise<WarriorRole | null> {
  if (!actorId?.trim()) return null;
  const client = sb();
  if (!client) {
    // Demo without Supabase: treat showcase id as fighter, never admin.
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
 * Privacy mutations: only own profile, or DB admin / env admin gate.
 * Spoofing a foreign profileId is rejected.
 */
export async function canEditProfilePrivacy(opts: {
  actorId?: string | null;
  profileId: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const actorId = opts.actorId?.trim();
  const profileId = opts.profileId.trim();
  if (!actorId) {
    return {
      ok: false,
      status: 401,
      message: "actorId обязателен — кто меняет настройки",
    };
  }
  if (actorId === profileId) return { ok: true };

  if (isEnvAdminGate()) return { ok: true };

  const role = await fetchActorRole(actorId);
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
}): Promise<{ ok: true; role: WarriorRole | "env-admin"; canDelete: boolean } | { ok: false; status: number; message: string }> {
  if (isEnvAdminGate()) {
    return { ok: true, role: "env-admin", canDelete: true };
  }

  const role = await fetchActorRole(opts.actorId);
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
