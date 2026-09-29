import { applyServerPaymentRewards } from "@/lib/payments/apply-rewards-server";
import { getPaymentIntent } from "@/lib/payments/store";
import { rpcRecordTrainingOnce } from "@/lib/supabase/economy-rpc";
import { requireWriteClient } from "@/lib/api-request";
import { hashedClientKey, jsonError, readJsonBody } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";
import {
  isLiveEconomyLocked,
  requireBoundUserId,
} from "@/lib/api-session";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

type SessionBody = {
  fighterId?: string;
  grossRub?: number;
  sessionType?: string;
  createdAt?: string;
  paymentId?: string;
};

const MAX_SESSION_GROSS_RUB = 100_000;

/**
 * Live: consume a succeeded payment intent exactly once.
 * Demo: optional unpaid session with server-generated source id.
 */
export async function POST(req: Request) {
  const limited = rateLimit({
    key: `session:${hashedClientKey(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<SessionBody>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);
  const body = parsed.body;

  const claimedFighter =
    typeof body.fighterId === "string" ? body.fighterId.trim() : "";
  const bound = await requireBoundUserId(claimedFighter || null);
  if (!bound.ok) {
    return jsonError(bound.message, bound.status);
  }
  const fighterId = bound.userId;

  const paymentId =
    typeof body.paymentId === "string" ? body.paymentId.trim() : "";

  if (isLiveEconomyLocked()) {
    if (!paymentId || paymentId.length > 128) {
      return jsonError("Нужен paymentId — сессию нельзя закрыть без оплаты", 402);
    }
  }

  if (paymentId) {
    const intent = await getPaymentIntent(paymentId);
    if (!intent) {
      return jsonError("Платёж не найден", 404);
    }
    if (intent.status !== "succeeded") {
      return jsonError("Оплата ещё не подтверждена", 402);
    }
    if (intent.fighterId && intent.fighterId !== fighterId) {
      return jsonError("Чужой платёж", 403);
    }
    if (!intent.fighterId) {
      return jsonError("Платёж без бойца", 402);
    }

    const result = await applyServerPaymentRewards(intent);
    if (!result.ok) {
      return jsonError(result.message, result.status);
    }

    return Response.json({
      ok: true,
      alreadyGranted: result.alreadyGranted,
      economics: {
        breakdown: {
          gross: result.grossRub,
          commissionPct: 19,
          commission: Math.round((result.grossRub * 19) / 100),
          net: result.grossRub - Math.round((result.grossRub * 19) / 100),
        },
        xpAward: result.xpAwarded,
      },
      advancement: {
        totalXpAfter: result.totalXpAfter,
        levelAfter: result.levelAfter,
      },
      cashbackRub: result.cashbackRub,
    });
  }

  const grossRub = typeof body.grossRub === "number" ? body.grossRub : NaN;
  if (!Number.isFinite(grossRub) || grossRub <= 0 || grossRub > MAX_SESSION_GROSS_RUB) {
    return jsonError("Некорректная сумма тренировки", 400);
  }

  const write = requireWriteClient();
  if (!write.ok) return jsonError(write.message, write.status);

  let createdAt: string | undefined;
  if (typeof body.createdAt === "string") {
    const ts = Date.parse(body.createdAt);
    if (Number.isFinite(ts) && ts <= Date.now()) {
      createdAt = new Date(ts).toISOString();
    }
  }

  const result = await rpcRecordTrainingOnce(write.client, {
    fighterId,
    grossRub,
    source: "demo_session",
    sourceId: randomUUID(),
    sessionType:
      typeof body.sessionType === "string" ? body.sessionType.slice(0, 64) : "training",
    createdAt,
  });

  if (!result.ok) {
    return jsonError(result.message, result.status);
  }

  return Response.json({
    ok: true,
    alreadyGranted: result.alreadyGranted,
    economics: {
      xpAward: result.xpAwarded,
    },
    advancement: {
      totalXpAfter: result.totalXpAfter,
      levelBefore: result.levelBefore,
      levelAfter: result.levelAfter,
    },
    monthlyXpAfter: result.monthlyXpAfter,
  });
}
