import { NextResponse } from "next/server";
import { getPaymentIntent } from "@/lib/payments/store";
import { buildPaymentSettlement } from "@/lib/payments/settle";

export async function POST(req: Request) {
  let paymentId: string | undefined;
  try {
    const body = (await req.json()) as { paymentId?: string };
    paymentId = body.paymentId;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  if (!paymentId) {
    return NextResponse.json(
      { ok: false, message: "paymentId обязателен" },
      { status: 400 },
    );
  }

  const intent = await getPaymentIntent(paymentId);
  if (!intent) {
    return NextResponse.json(
      { ok: false, message: "Платёж не найден" },
      { status: 404 },
    );
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
