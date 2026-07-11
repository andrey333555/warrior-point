import { NextResponse } from "next/server";
import {
  findPaymentByYookassaId,
  getPaymentIntent,
  updatePaymentStatus,
} from "@/lib/payments/store";
import { buildPaymentSettlement, formatSettlementLog } from "@/lib/payments/settle";
import { getYooKassaPayment, isYooKassaConfigured } from "@/lib/payments/yookassa";
import { applyServerPaymentRewards } from "@/lib/payments/apply-rewards-server";

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

  const object = payload.object;
  if (!object?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId =
    object.metadata?.paymentId ??
    (await findPaymentByYookassaId(object.id))?.id;

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  // The webhook body is untrusted. When YooKassa is configured, we never act on
  // the payload directly — we re-fetch the payment by id and trust only that.
  let status = object.status;
  if (isYooKassaConfigured()) {
    const verified = await getYooKassaPayment(object.id);
    if (!verified) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    status = verified.status;

    const intent = await getPaymentIntent(paymentId);
    // Guard against amount tampering: the paid sum must match the intent.
    if (
      intent &&
      status === "succeeded" &&
      Math.round(verified.amountRub) !== Math.round(intent.grossRub)
    ) {
      return NextResponse.json(
        { ok: false, message: "Amount mismatch" },
        { status: 409 },
      );
    }
  }

  if (status === "succeeded") {
    const intent = await getPaymentIntent(paymentId);
    if (intent && intent.status !== "succeeded") {
      const settlement = buildPaymentSettlement(intent.grossRub);
      await updatePaymentStatus(paymentId, "succeeded", {
        yookassaId: object.id,
      });
      await applyServerPaymentRewards(intent);
      if (process.env.NODE_ENV === "development") {
        console.info(
          "[webhook] payment succeeded:",
          formatSettlementLog(intent.grossRub, settlement),
        );
      }
    }
  }

  if (status === "canceled") {
    await updatePaymentStatus(paymentId, "canceled", { yookassaId: object.id });
  }

  return NextResponse.json({ ok: true });
}
