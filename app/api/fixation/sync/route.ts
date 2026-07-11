import { NextResponse } from "next/server";
import { validateServerFixationSession } from "@/lib/fixation-server";
import type { FixationSession } from "@/lib/session-fixation";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";
import { recordServerTrainingSession } from "@/lib/supabase/session-server";

export const runtime = "nodejs";

type SyncBody = {
  session?: FixationSession;
};

/**
 * Server-authoritative fixation sync.
 *
 * Re-verifies check-in proof (code / QR / Bluetooth) before writing
 * `training_sessions` + `fighter_stats` with the service-role client.
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

  const validation = validateServerFixationSession(session);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, message: validation.errors.join(" · ") },
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
    fighterId: session.fighterId,
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
