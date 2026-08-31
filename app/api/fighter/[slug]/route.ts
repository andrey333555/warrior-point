import { NextResponse } from "next/server";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import {
  fetchFighterBySlug,
  getDemoFighterBySlug,
  redactFighterForAnonymous,
  type FighterPublicProfile,
} from "@/lib/fighter-public";
import { fetchActorRole } from "@/lib/api-actor";
import { getApiSessionUserId } from "@/lib/api-session";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

function withCardFields(profile: FighterPublicProfile): FighterPublicProfile {
  return {
    ...profile,
    nickname: profile.nickname ?? null,
    donationGoal: profile.donationGoal ?? null,
  };
}

export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!slug || slug.length > 64) {
    return NextResponse.json(
      { ok: false, message: "Боец не найден" },
      { status: 404 },
    );
  }

  const sb = createWarriorBrowserClient();
  const raw =
    (sb ? await fetchFighterBySlug(sb, slug) : null) ??
    getDemoFighterBySlug(slug);

  if (!raw) {
    return NextResponse.json(
      { ok: false, message: "Боец не найден" },
      { status: 404 },
    );
  }

  const sessionId = await getApiSessionUserId();
  const role = sessionId ? await fetchActorRole(sessionId) : null;
  const privileged = role === "admin" || role === "coach";

  if (privileged) {
    return NextResponse.json({ ok: true, profile: withCardFields(raw) });
  }

  return NextResponse.json({
    ok: true,
    profile: withCardFields(redactFighterForAnonymous(raw)),
  });
}
