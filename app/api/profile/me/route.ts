import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { requireBoundUserId } from "@/lib/api-session";
import { resolveWarriorRole } from "@/lib/roles";

export const runtime = "nodejs";

function client() {
  return createWarriorServiceClient() ?? createWarriorBrowserClient();
}

/**
 * Own role + balance for the authenticated session (or demo actor).
 *
 * Replaces the old client-side anon-key `.from("profiles").select("role"/"balance")`
 * reads — those trusted a raw id and, worse, ran against a table anon can no
 * longer select at all after the RLS lockdown (0023). This is the only place
 * a viewer's own privileged fields should be read from now on.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const actorId = url.searchParams.get("actorId");

  const bound = await requireBoundUserId(actorId);
  if (!bound.ok) {
    return NextResponse.json(
      { ok: false, message: bound.message },
      { status: bound.status },
    );
  }

  const sb = client();
  if (!sb) {
    return NextResponse.json({
      ok: true,
      mock: true,
      role: "fighter",
      balance: 0,
      displayName: null,
    });
  }

  const { data, error } = await sb
    .from("profiles")
    .select("role, balance, display_name")
    .eq("id", bound.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    role: resolveWarriorRole(data?.role),
    balance: Number(data?.balance) || 0,
    displayName:
      typeof data?.display_name === "string" && data.display_name.trim()
        ? data.display_name
        : null,
  });
}
