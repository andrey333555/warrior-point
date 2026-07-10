import { NextResponse } from "next/server";
import {
  findPaymentByYookassaId,
  getPaymentIntent,
  updatePaymentStatus,
} from "@/lib/payments/store";
import { buildPaymentSettlement, formatSettlementLog } from "@/lib/payments/settle";

type WebhookPayload = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
};

export async function POST(req: Request) {
  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = payload.event;
  const object = payload.object;
  if (!object?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId =
    object.metadata?.paymentId ?? findPaymentByYookassaId(object.id)?.id;

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  if (event === "payment.succeeded" || object.status === "succeeded") {
    const intent = getPaymentIntent(paymentId);
    if (intent && intent.status !== "succeeded") {
      const settlement = buildPaymentSettlement(intent.grossRub);
      updatePaymentStatus(paymentId, "succeeded", {
        yookassaId: object.id,
      });
      if (process.env.NODE_ENV === "development") {
        console.info(
          "[webhook] payment succeeded:",
          formatSettlementLog(intent.grossRub, settlement),
        );
      }
    }
  }

  if (event === "payment.canceled" || object.status === "canceled") {
    updatePaymentStatus(paymentId, "canceled", { yookassaId: object.id });
  }

  return NextResponse.json({ ok: true });
}
