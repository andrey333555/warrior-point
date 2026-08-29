import { NextResponse } from "next/server";
import { createFightPayment } from "@/lib/payments/create-intent";
import { applyServerPaymentRewards } from "@/lib/payments/apply-rewards-server";
import {
  getPaymentIntent,
  updatePaymentStatus,
} from "@/lib/payments/store";
import { validateGrossRub } from "@/lib/payments/validate-price";
import type { BookingType } from "@/lib/bookings";
import {
  isLiveEconomyLocked,
  isMockPaymentsAllowed,
  requireBoundUserId,
} from "@/lib/api-session";
import { isYooKassaConfigured } from "@/lib/payments/yookassa";
import { hashedClientKey, jsonError, readJsonBody } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type Body = {
  fighterId?: string;
  trainerId?: number;
  trainerName?: string;
  gymName?: string;
  date?: string;
  time?: string;
  trainingType?: BookingType;
  grossRub?: number;
};

function isBookingType(v: unknown): v is BookingType {
  return v === "individual" || v === "group" || v === "split";
}

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `pay-create:${hashedClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return jsonError("Слишком много запросов", 429);
  }

  const parsed = await readJsonBody<Body>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);
  const body = parsed.body;

  const claimed =
    typeof body.fighterId === "string" ? body.fighterId.trim() : "";
  const bound = await requireBoundUserId(claimed || null);
  if (!bound.ok) {
    return jsonError(bound.message, bound.status);
  }

  const trainerId = Number(body.trainerId);
  if (!Number.isFinite(trainerId) || trainerId <= 0) {
    return jsonError("trainerId обязателен", 400);
  }

  const trainerName =
    typeof body.trainerName === "string" ? body.trainerName.trim().slice(0, 120) : "";
  const gymName =
    typeof body.gymName === "string" ? body.gymName.trim().slice(0, 120) : "";
  const date = typeof body.date === "string" ? body.date.trim().slice(0, 32) : "";
  const time = typeof body.time === "string" ? body.time.trim().slice(0, 32) : "";

  if (!trainerName || !gymName || !date || !time) {
    return jsonError("Заполни данные тренировки", 400);
  }

  const priceCheck = validateGrossRub(trainerId, body.grossRub);
  if (!priceCheck.ok) {
    return jsonError(priceCheck.message, 400);
  }

  if (isLiveEconomyLocked() && !isYooKassaConfigured()) {
    return jsonError("ЮKassa не настроена", 503);
  }

  const trainingType = isBookingType(body.trainingType) ? body.trainingType : "split";
  const origin = new URL(req.url).origin;

  const result = await createFightPayment({
    fighterId: bound.userId,
    trainerId,
    trainerName,
    gymName,
    date,
    time,
    trainingType,
    grossRub: priceCheck.grossRub,
    origin,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  if (result.mock) {
    if (!isMockPaymentsAllowed()) {
      return jsonError("Mock-оплата отключена", 403);
    }
    await updatePaymentStatus(result.paymentId, "succeeded");
    const intent = await getPaymentIntent(result.paymentId);
    if (intent) {
      void applyServerPaymentRewards(intent).catch((err) => {
        console.warn("[payments] mock server rewards:", err);
      });
    }
  }

  return NextResponse.json({
    ok: true,
    paymentId: result.paymentId,
    confirmationUrl: result.confirmationUrl,
    breakdown: result.breakdown,
    mock: result.mock && isMockPaymentsAllowed(),
  });
}
