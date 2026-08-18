import { NextResponse } from "next/server";
import { recordServerTrainingSession } from "@/lib/supabase/session-server";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";
import { requireBoundUserId, isLiveEconomyLocked } from "@/lib/api-session";

export const runtime = "nodejs";

type SessionBody = {
  fighterId?: string;
  grossRub?: number;
  sessionType?: string;
  /** Original queue timestamp for offline-synced sessions. */
  createdAt?: string;
  /** Optional payment proof — required in live production. */
  paymentId?: string;
};

const MAX_SESSION_GROSS_RUB = 100_000;

/**
 * Server-authoritative training session completion.
 * Identity must match session (or demo gate). Live prod requires paymentId.
 */
export async function POST(req: Request) {
  let body: SessionBody;
  try {
    body = (await req.json()) as SessionBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const claimedFighter =
    typeof body.fighterId === "string" ? body.fighterId.trim() : "";
  const grossRub = typeof body.grossRub === "number" ? body.grossRub : NaN;

  const bound = await requireBoundUserId(claimedFighter || null);
  if (!bound.ok) {
    return NextResponse.json(
      { ok: false, message: bound.message },
      { status: bound.status },
    );
  }
  const fighterId = bound.userId;

  if (!Number.isFinite(grossRub) || grossRub <= 0 || grossRub > MAX_SESSION_GROSS_RUB) {
    return NextResponse.json(
      { ok: false, message: "Некорректная сумма тренировки" },
      { status: 400 },
    );
  }

  // Live launch: free XP mint without payment is not allowed.
  if (isLiveEconomyLocked()) {
    const paymentId =
      typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    if (!paymentId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Нужен paymentId — сессию нельзя закрыть без оплаты",
        },
        { status: 402 },
      );
    }
  }

  let createdAt: string | undefined;
  if (typeof body.createdAt === "string") {
    const ts = Date.parse(body.createdAt);
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
