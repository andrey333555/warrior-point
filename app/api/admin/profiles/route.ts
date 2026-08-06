import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { isWarriorRole, resolveWarriorRole } from "@/lib/roles";
import { isWarriorAdminMode } from "@/lib/admin";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

function client() {
  return createWarriorServiceClient() ?? createWarriorBrowserClient();
}

/** List profiles for admin / coach (read-only for coach). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const actorId = url.searchParams.get("actorId")?.trim();
  const adminGate =
    isWarriorAdminMode() || url.searchParams.get("admin") === "1";

  const sb = client();
  let actorRole: ReturnType<typeof resolveWarriorRole> | null = null;

  if (sb && actorId) {
    const { data } = await sb
      .from("profiles")
      .select("role")
      .eq("id", actorId)
      .maybeSingle();
    if (data) actorRole = resolveWarriorRole(data.role);
  }

  const allowed =
    adminGate || actorRole === "admin" || actorRole === "coach";
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Нет доступа" },
      { status: 403 },
    );
  }

  if (!sb) {
    return NextResponse.json({
      ok: true,
      canDelete: adminGate || actorRole === "admin",
      profiles: [
        {
          id: DEMO_FIGHTER_DB_ID,
          displayName: "Виктор Колесник",
          role: "fighter",
          slug: "kolesnik",
          visibility: "public",
          verificationStatus: "none",
        },
      ],
    });
  }

  const { data, error } = await sb
    .from("profiles")
    .select(
      "id, display_name, role, slug, visibility, verification_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    canDelete: adminGate || actorRole === "admin",
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

/** Soft-delete stub — admin only. Marks role stay; real delete is TODO harden. */
export async function DELETE(req: Request) {
  let body: { actorId?: string; profileId?: string; confirm?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (!body.confirm || !body.profileId) {
    return NextResponse.json(
      { ok: false, message: "Нужны profileId и confirm: true" },
      { status: 400 },
    );
  }

  const sb = client();
  const adminGate = isWarriorAdminMode();
  let isAdmin = adminGate;

  if (sb && body.actorId) {
    const { data } = await sb
      .from("profiles")
      .select("role")
      .eq("id", body.actorId)
      .maybeSingle();
    isAdmin = isAdmin || resolveWarriorRole(data?.role) === "admin";
  }

  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, message: "Только admin" },
      { status: 403 },
    );
  }

  // Scaffold: do not hard-delete PII yet — flag via fighter_status
  if (!sb) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message: "Удаление stub (demo). На проде — серверный hard-delete + аудит.",
    });
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
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Профиль помечен как Deleted (soft). Hard-delete — backlog.",
  });
}

/** Role change stub — service role only path. */
export async function PATCH(req: Request) {
  let body: { actorId?: string; profileId?: string; role?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (!body.profileId || !isWarriorRole(body.role)) {
    return NextResponse.json(
      { ok: false, message: "profileId и role обязательны" },
      { status: 400 },
    );
  }

  const sb = createWarriorServiceClient();
  if (!sb) {
    return NextResponse.json({
      ok: false,
      message: "Нужен SUPABASE_SERVICE_ROLE_KEY для смены роли",
    }, { status: 503 });
  }

  const adminGate = isWarriorAdminMode();
  let isAdmin = adminGate;
  if (body.actorId) {
    const { data } = await sb
      .from("profiles")
      .select("role")
      .eq("id", body.actorId)
      .maybeSingle();
    isAdmin = isAdmin || resolveWarriorRole(data?.role) === "admin";
  }
  if (!isAdmin) {
    return NextResponse.json({ ok: false, message: "Только admin" }, { status: 403 });
  }

  const { error } = await sb
    .from("profiles")
    .update({ role: body.role, updated_at: new Date().toISOString() })
    .eq("id", body.profileId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
