import { NextResponse } from "next/server";
import {
  handleBookSplit,
  type BookSplitResult,
} from "@/lib/supabase/split-booking";
import { requireBoundUserId, isLiveEconomyLocked } from "@/lib/api-session";
import {
  hashedClientKey,
  jsonError,
  readJsonBody,
  requireWriteClient,
} from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";
import { rpcBookSplit } from "@/lib/supabase/economy-rpc";
import { splitSettlement } from "@/lib/economy";
import { SPLIT_CLIENT_GROSS_RUB } from "@/lib/supabase/split-booking";

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

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `split-book:${hashedClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<BookBody>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);
  const body = parsed.body;

  const claimedClient =
    typeof body.clientId === "string" ? body.clientId.trim() : "";
  const splitId = typeof body.splitId === "string" ? body.splitId.trim() : "";

  if (!splitId || splitId.length > 64) {
    return jsonError("splitId обязателен", 400);
  }

  const bound = await requireBoundUserId(claimedClient || null);
  if (!bound.ok) {
    return jsonError(bound.message, bound.status);
  }

  const write = requireWriteClient();
  if (!write.ok) return jsonError(write.message, write.status);

  const rpc = await rpcBookSplit(write.client, {
    splitId,
    clientId: bound.userId,
    grossRub: SPLIT_CLIENT_GROSS_RUB,
  });

  if (rpc.ok) {
    return NextResponse.json({
      ok: true,
      bookedCount: rpc.bookedCount,
      activated: rpc.activated,
      newBalance: rpc.newBalance,
      dailyStreak: rpc.dailyStreak,
      iphoneTickets: rpc.iphoneTickets,
      breakdown: splitSettlement(SPLIT_CLIENT_GROSS_RUB),
    });
  }

  if (rpc.code !== "DB_ERROR" || isLiveEconomyLocked()) {
    const status =
      ERROR_STATUS[rpc.code as Extract<BookSplitResult, { ok: false }>["code"]] ??
      502;
    return jsonError(rpc.message, status);
  }

  const result = await handleBookSplit(write.client, {
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
