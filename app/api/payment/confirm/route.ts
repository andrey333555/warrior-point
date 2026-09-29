import { NextResponse } from "next/server";
import { getPaymentIntent } from "@/lib/payments/store";
import { buildPaymentSettlement } from "@/lib/payments/settle";
import { requireBoundUserId } from "@/lib/api-session";
import { hashedClientKey, jsonError, readJsonBody } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `pay-confirm:${hashedClientKey(req)}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<{ paymentId?: string }>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);

  const paymentId =
    typeof parsed.body.paymentId === "string" ? parsed.body.paymentId.trim() : "";
  if (!paymentId || paymentId.length > 128) {
    return jsonError("paymentId обязателен", 400);
  }

  const bound = await requireBoundUserId(null);
  if (!bound.ok) {
    return jsonError(bound.message, bound.status);
  }

  const intent = await getPaymentIntent(paymentId);
  if (!intent) {
    return jsonError("Платёж не найден", 404);
  }

  if (intent.fighterId && intent.fighterId !== bound.userId) {
    return jsonError("Чужой платёж", 403);
  }

  if (intent.status !== "succeeded") {
    return NextResponse.json(
      {
        ok: false,
        message: "Оплата ещё не подтверждена",
        status: intent.status,
      },
      { status: 409 },
    );
  }

  const settlement = buildPaymentSettlement(intent.grossRub);

  return NextResponse.json({
    ok: true,
    paymentId: intent.id,
    bookingId: intent.bookingId,
    trainerId: intent.trainerId,
    trainerName: intent.trainerName,
    gymName: intent.gymName,
    trainingType: intent.trainingType,
    grossRub: intent.grossRub,
    settlement,
  });
}
