import { NextResponse } from "next/server";
import { validateServerFixationSession } from "@/lib/fixation-server";
import type { FixationSession } from "@/lib/session-fixation";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";
import { recordServerTrainingSession } from "@/lib/supabase/session-server";
import { requireBoundUserId, isLiveEconomyLocked } from "@/lib/api-session";

export const runtime = "nodejs";

type SyncBody = {
  session?: FixationSession;
};

/**
 * Server-authoritative fixation sync.
 * Re-verifies check-in proof, then binds fighterId to session before XP write.
 */
export async function POST(req: Request) {
  let body: SyncBody;
  try {
    body = (await req.json()) as SyncBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const session = body.session;
  if (!session?.sessionKey || !session.fighterId) {
    return NextResponse.json(
      { ok: false, message: "session обязателен" },
      { status: 400 },
    );
  }

  const bound = await requireBoundUserId(session.fighterId);
  if (!bound.ok) {
    return NextResponse.json(
      { ok: false, message: bound.message },
      { status: bound.status },
    );
  }

  const validation = validateServerFixationSession({
    ...session,
    fighterId: bound.userId,
  });
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, message: validation.errors.join(" · ") },
      { status: 400 },
    );
  }

  if (isLiveEconomyLocked() && !session.confirmMethod) {
    return NextResponse.json(
      { ok: false, message: "Нужен метод check-in" },
      { status: 400 },
    );
  }

  const client = createWarriorServerWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Supabase не настроен" },
      { status: 503 },
    );
  }

  const confirmedAt = session.confirmedAt ?? new Date().toISOString();
  const result = await recordServerTrainingSession(client, {
    fighterId: bound.userId,
    grossRub: session.grossRub,
    sessionType: `fixation_${session.confirmMethod ?? "unknown"}`,
    createdAt: confirmedAt,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    sessionKey: session.sessionKey,
    economics: result.economics,
    advancement: result.advancement,
    monthlyXpAfter: result.monthlyXpAfter,
  });
}
