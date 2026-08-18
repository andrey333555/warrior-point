import { NextResponse } from "next/server";
import {
  handleBookSplit,
  type BookSplitResult,
} from "@/lib/supabase/split-booking";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";
import { requireBoundUserId } from "@/lib/api-session";

export const runtime = "nodejs";

type BookBody = {
  clientId?: string;
  splitId?: string;
};

const ERROR_STATUS: Record<
  Extract<BookSplitResult, { ok: false }>["code"],
  number
> = {
  NOT_FOUND: 404,
  FULL: 409,
  ALREADY_BOOKED: 409,
  INSUFFICIENT_BALANCE: 402,
  UNAUTHENTICATED: 401,
  DB_ERROR: 502,
};

/**
 * Server-authoritative split booking.
 * clientId must match authenticated session (or demo gate).
 */
export async function POST(req: Request) {
  let body: BookBody;
  try {
    body = (await req.json()) as BookBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const claimedClient =
    typeof body.clientId === "string" ? body.clientId.trim() : "";
  const splitId = typeof body.splitId === "string" ? body.splitId.trim() : "";

  if (!splitId) {
    return NextResponse.json(
      { ok: false, message: "splitId обязателен" },
      { status: 400 },
    );
  }

  const bound = await requireBoundUserId(claimedClient || null);
  if (!bound.ok) {
    return NextResponse.json(
      { ok: false, message: bound.message },
      { status: bound.status },
    );
  }

  const client = createWarriorServerWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Supabase не настроен" },
      { status: 503 },
    );
  }

  const result = await handleBookSplit(client, {
    splitId,
    clientId: bound.userId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: ERROR_STATUS[result.code] ?? 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    bookedCount: result.bookedCount,
    activated: result.activated,
    newBalance: result.newBalance,
    dailyStreak: result.dailyStreak,
    iphoneTickets: result.iphoneTickets,
    breakdown: result.breakdown,
  });
}
