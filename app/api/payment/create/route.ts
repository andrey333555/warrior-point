import { NextResponse } from "next/server";
import { createFightPayment } from "@/lib/payments/create-intent";
import type { BookingType } from "@/lib/bookings";

type Body = {
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
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const trainerId = Number(body.trainerId);
  if (!Number.isFinite(trainerId) || trainerId <= 0) {
    return NextResponse.json(
      { ok: false, message: "trainerId обязателен" },
      { status: 400 },
    );
  }

  if (!body.trainerName || !body.gymName || !body.date || !body.time) {
    return NextResponse.json(
      { ok: false, message: "Заполни данные тренировки" },
      { status: 400 },
    );
  }

  const trainingType = isBookingType(body.trainingType) ? body.trainingType : "split";
  const origin = new URL(req.url).origin;

  const result = await createFightPayment({
    trainerId,
    trainerName: body.trainerName,
    gymName: body.gymName,
    date: body.date,
    time: body.time,
    trainingType,
    grossRub: body.grossRub,
    origin,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    paymentId: result.paymentId,
    confirmationUrl: result.confirmationUrl,
    breakdown: result.breakdown,
    mock: result.mock,
  });
}
