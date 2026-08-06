import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import {
  fetchFighterBySlug,
  getDemoFighterBySlug,
  redactFighterForAnonymous,
} from "@/lib/fighter-public";
import { fetchActorRole } from "@/lib/api-actor";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Public fighter card payload.
 * Privileged actor (admin/coach) gets full limited/private fields.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const actorId = new URL(req.url).searchParams.get("actorId")?.trim();

  const sb = createWarriorServiceClient() ?? createWarriorBrowserClient();
  const raw =
    (sb ? await fetchFighterBySlug(sb, slug) : null) ??
    getDemoFighterBySlug(slug);

  if (!raw) {
    return NextResponse.json(
      { ok: false, message: "Боец не найден" },
      { status: 404 },
    );
  }

  const role = await fetchActorRole(actorId);
  const privileged = role === "admin" || role === "coach";

  if (privileged) {
    return NextResponse.json({ ok: true, profile: raw });
  }

  return NextResponse.json({
    ok: true,
    profile: redactFighterForAnonymous(raw),
  });
}
