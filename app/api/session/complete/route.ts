import { NextResponse } from "next/server";
import { recordServerTrainingSession } from "@/lib/supabase/session-server";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";

export const runtime = "nodejs";

type SessionBody = {
  fighterId?: string;
  grossRub?: number;
  sessionType?: string;
  /** Original queue timestamp for offline-synced sessions. */
  createdAt?: string;
};

const MAX_SESSION_GROSS_RUB = 100_000;

/**
 * Server-authoritative training session completion.
 *
 * The client sends only fighterId + gross; XP, level and the 19% settlement
 * are recomputed here and written with the service-role client, so DevTools
 * cannot inflate `fighter_stats.total_xp`.
 */
export async function POST(req: Request) {
  let body: SessionBody;
  try {
    body = (await req.json()) as SessionBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const fighterId = typeof body.fighterId === "string" ? body.fighterId.trim() : "";
  const grossRub = typeof body.grossRub === "number" ? body.grossRub : NaN;

  if (!fighterId || fighterId.length > 128) {
    return NextResponse.json(
      { ok: false, message: "fighterId обязателен" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(grossRub) || grossRub <= 0 || grossRub > MAX_SESSION_GROSS_RUB) {
    return NextResponse.json(
      { ok: false, message: "Некорректная сумма тренировки" },
      { status: 400 },
    );
  }

  let createdAt: string | undefined;
  if (typeof body.createdAt === "string") {
    const ts = Date.parse(body.createdAt);
    // Only accept plausible past timestamps (offline queue backfill).
    if (Number.isFinite(ts) && ts <= Date.now()) {
      createdAt = new Date(ts).toISOString();
    }
  }

  const client = createWarriorServerWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Supabase не настроен" },
      { status: 503 },
    );
  }

  const result = await recordServerTrainingSession(client, {
    fighterId,
    grossRub,
    sessionType:
      typeof body.sessionType === "string" ? body.sessionType.slice(0, 64) : undefined,
    createdAt,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    economics: result.economics,
    advancement: result.advancement,
    monthlyXpAfter: result.monthlyXpAfter,
  });
}
