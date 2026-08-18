import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { isWarriorRole, resolveWarriorRole } from "@/lib/roles";
import { canAccessAdmin } from "@/lib/api-actor";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

function client() {
  return createWarriorServiceClient() ?? createWarriorBrowserClient();
}

/** List profiles — admin/coach from session role, or WARRIOR_ADMIN_SECRET. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const actorId = url.searchParams.get("actorId")?.trim();
  const adminSecret = req.headers.get("x-warrior-admin-secret");

  const gate = await canAccessAdmin({ actorId, write: false, adminSecret });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, message: gate.message },
      { status: gate.status },
    );
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

  const adminSecret = req.headers.get("x-warrior-admin-secret");
  const gate = await canAccessAdmin({
    actorId: body.actorId,
    write: true,
    adminSecret,
  });
  if (!gate.ok || !gate.canDelete) {
    return NextResponse.json(
      { ok: false, message: gate.ok ? "Только admin" : gate.message },
      { status: gate.ok ? 403 : gate.status },
    );
  }

  const sb = client();
  if (!sb) {
    return NextResponse.json({
      ok: true,
      mock: true,
      message: "Удаление stub (demo).",
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
    message: "Профиль помечен как Deleted (soft).",
  });
}

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

  const adminSecret = req.headers.get("x-warrior-admin-secret");
  const gate = await canAccessAdmin({
    actorId: body.actorId,
    write: true,
    adminSecret,
  });
  if (!gate.ok || !gate.canDelete) {
    return NextResponse.json(
      { ok: false, message: gate.ok ? "Только admin" : gate.message },
      { status: gate.ok ? 403 : gate.status },
    );
  }

  const sb = createWarriorServiceClient();
  if (!sb) {
    return NextResponse.json(
      {
        ok: false,
        message: "Нужен SUPABASE_SERVICE_ROLE_KEY для смены роли",
      },
      { status: 503 },
    );
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
