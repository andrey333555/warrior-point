import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { isWarriorRole, resolveWarriorRole } from "@/lib/roles";
import { canAccessAdmin } from "@/lib/api-actor";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";
import { hashedClientKey, jsonError, readJsonBody, safeDbMessage } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";

function client() {
  return createWarriorServiceClient();
}

export async function GET(req: Request) {
  const limited = rateLimit({
    key: `admin-get:${hashedClientKey(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const url = new URL(req.url);
  const actorId = url.searchParams.get("actorId")?.trim();
  const adminSecret = req.headers.get("x-warrior-admin-secret");

  const gate = await canAccessAdmin({ actorId, write: false, adminSecret });
  if (!gate.ok) {
    return jsonError(gate.message, gate.status);
  }

  const sb = client();
  if (!sb) {
    return NextResponse.json({
      ok: true,
      canDelete: gate.canDelete,
      profiles: [
        {
          id: DEMO_FIGHTER_DB_ID,
          displayName: "King León",
          role: "fighter",
          slug: "king",
          visibility: "public",
          verificationStatus: "none",
        },
      ],
    });
  }

  let query = sb
    .from("profiles")
    .select(
      "id, display_name, role, slug, visibility, verification_status, created_at, coach_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (gate.role === "coach") {
    if (!gate.actorId) {
      return jsonError("Нет доступа", 403);
    }
    query = query.eq("coach_id", gate.actorId);
  }

  const { data, error } = await query;

  if (error) {
    return jsonError(safeDbMessage(error.message), 502);
  }

  return NextResponse.json({
    ok: true,
    canDelete: gate.canDelete,
    profiles: (data ?? []).map((row) => ({
      id: row.id as string,
      displayName:
        typeof row.display_name === "string" ? row.display_name : null,
      role: resolveWarriorRole(row.role),
      slug: typeof row.slug === "string" ? row.slug : null,
      visibility:
        typeof row.visibility === "string" ? row.visibility : "public",
      verificationStatus:
        typeof row.verification_status === "string"
          ? row.verification_status
          : "none",
    })),
  });
}

export async function DELETE(req: Request) {
  const parsed = await readJsonBody<{
    actorId?: string;
    profileId?: string;
    confirm?: boolean;
  }>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);
  const body = parsed.body;

  if (!body.confirm || !body.profileId) {
    return jsonError("Нужны profileId и confirm: true", 400);
  }

  const adminSecret = req.headers.get("x-warrior-admin-secret");
  const gate = await canAccessAdmin({
    actorId: body.actorId,
    write: true,
    adminSecret,
  });
  if (!gate.ok || !gate.canDelete) {
    return jsonError(gate.ok ? "Только admin" : gate.message, gate.ok ? 403 : gate.status);
  }

  const sb = client();
  if (!sb) {
    return jsonError("Нужен SUPABASE_SERVICE_ROLE_KEY", 503);
  }

  const { error } = await sb
    .from("profiles")
    .update({
      fighter_status: "Deleted",
      visibility: "private",
      booking_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.profileId);

  if (error) {
    return jsonError(safeDbMessage(error.message), 502);
  }

  return NextResponse.json({
    ok: true,
    message: "Профиль помечен как Deleted (soft).",
  });
}

export async function PATCH(req: Request) {
  const parsed = await readJsonBody<{
    actorId?: string;
    profileId?: string;
    role?: string;
  }>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);
  const body = parsed.body;

  if (!body.profileId || !isWarriorRole(body.role)) {
    return jsonError("profileId и role обязательны", 400);
  }

  const adminSecret = req.headers.get("x-warrior-admin-secret");
  const gate = await canAccessAdmin({
    actorId: body.actorId,
    write: true,
    adminSecret,
  });
  if (!gate.ok || !gate.canDelete) {
    return jsonError(gate.ok ? "Только admin" : gate.message, gate.ok ? 403 : gate.status);
  }

  const sb = createWarriorServiceClient();
  if (!sb) {
    return jsonError("Нужен SUPABASE_SERVICE_ROLE_KEY для смены роли", 503);
  }

  const { error } = await sb
    .from("profiles")
    .update({ role: body.role, updated_at: new Date().toISOString() })
    .eq("id", body.profileId);

  if (error) {
    return jsonError(safeDbMessage(error.message), 502);
  }

  return NextResponse.json({ ok: true });
}
