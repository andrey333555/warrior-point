import { validateServerFixationSession } from "@/lib/fixation-server";
import type { FixationSession } from "@/lib/session-fixation";
import { requireWriteClient, hashedClientKey, jsonError, readJsonBody } from "@/lib/api-request";
import { rpcRecordTrainingOnce } from "@/lib/supabase/economy-rpc";
import { requireBoundUserId, isLiveEconomyLocked } from "@/lib/api-session";
import { isCheckinSecretConfigured } from "@/lib/checkin-server";
import { getPaymentIntent } from "@/lib/payments/store";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type SyncBody = {
  session?: FixationSession;
  paymentId?: string;
};

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `fix:${hashedClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<SyncBody>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);

  const session = parsed.body.session;
  if (!session?.sessionKey || !session.fighterId) {
    return jsonError("session обязателен", 400);
  }

  if (session.sessionKey.length < 6 || session.sessionKey.length > 64) {
    return jsonError("Невалидный session key", 400);
  }

  const bound = await requireBoundUserId(session.fighterId);
  if (!bound.ok) {
    return jsonError(bound.message, bound.status);
  }

  if (isLiveEconomyLocked()) {
    if (!isCheckinSecretConfigured()) {
      return jsonError("Check-in не настроен (нужен CHECKIN_SECRET)", 503);
    }
    if (session.confirmMethod === "bluetooth") {
      return jsonError("Bluetooth check-in отключён", 400);
    }
  }

  const validation = validateServerFixationSession({
    ...session,
    fighterId: bound.userId,
  });
  if (!validation.valid) {
    return jsonError(validation.errors.join(" · "), 400);
  }

  let grossRub = session.grossRub;
  const paymentId =
    typeof parsed.body.paymentId === "string"
      ? parsed.body.paymentId.trim()
      : "";

  if (isLiveEconomyLocked()) {
    if (!paymentId) {
      return jsonError("Нужна оплаченная бронь (paymentId)", 402);
    }
    const intent = await getPaymentIntent(paymentId);
    if (!intent || intent.status !== "succeeded") {
      return jsonError("Оплата не подтверждена", 402);
    }
    if (intent.fighterId && intent.fighterId !== bound.userId) {
      return jsonError("Чужой платёж", 403);
    }
    grossRub = intent.grossRub;
  }

  if (!Number.isFinite(grossRub) || grossRub <= 0 || grossRub > 100_000) {
    return jsonError("Некорректная сумма тренировки", 400);
  }

  const write = requireWriteClient();
  if (!write.ok) return jsonError(write.message, write.status);

  const confirmedAt = session.confirmedAt ?? new Date().toISOString();
  const result = await rpcRecordTrainingOnce(write.client, {
    fighterId: bound.userId,
    grossRub,
    source: "fixation",
    sourceId: session.sessionKey,
    sessionType: `fixation_${session.confirmMethod ?? "unknown"}`,
    createdAt: confirmedAt,
    paymentId: paymentId || undefined,
    fixationSessionKey: session.sessionKey,
  });

  if (!result.ok) {
    return jsonError(result.message, result.status);
  }

  return Response.json({
    ok: true,
    alreadyGranted: result.alreadyGranted,
    sessionKey: session.sessionKey,
    economics: { xpAward: result.xpAwarded },
    advancement: {
      totalXpAfter: result.totalXpAfter,
      levelBefore: result.levelBefore,
      levelAfter: result.levelAfter,
    },
    monthlyXpAfter: result.monthlyXpAfter,
  });
}
