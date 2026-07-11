import { NextResponse } from "next/server";
import { handleBookSplit, type BookSplitResult } from "@/lib/supabase/split-booking";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";

export const runtime = "nodejs";

type BookBody = {
  clientId?: string;
  splitId?: string;
};

const ERROR_STATUS: Record<Extract<BookSplitResult, { ok: false }>["code"], number> = {
  NOT_FOUND: 404,
  FULL: 409,
  ALREADY_BOOKED: 409,
  INSUFFICIENT_BALANCE: 402,
  UNAUTHENTICATED: 401,
  DB_ERROR: 502,
};

/**
 * Server-authoritative split booking: debit client balance, credit coach
 * earnings, insert booking + verified training_session, bump streak/XP.
 * Gross is fixed server-side (SPLIT_CLIENT_GROSS_RUB) — the client cannot
 * pass its own price.
 */
export async function POST(req: Request) {
  let body: BookBody;
  try {
    body = (await req.json()) as BookBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const splitId = typeof body.splitId === "string" ? body.splitId.trim() : "";

  if (!clientId || !splitId) {
    return NextResponse.json(
      { ok: false, message: "clientId и splitId обязательны" },
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

  const result = await handleBookSplit(client, { clientId, splitId });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: ERROR_STATUS[result.code] },
    );
  }

  return NextResponse.json({
    ok: true,
    bookedCount: result.bookedCount,
    activated: result.activated,
    breakdown: result.breakdown,
    newBalance: result.newBalance,
    dailyStreak: result.dailyStreak,
    iphoneTickets: result.iphoneTickets,
  });
}
