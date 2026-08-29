import { NextResponse } from "next/server";
import {
  findPaymentByYookassaId,
  getPaymentIntent,
  updatePaymentStatus,
} from "@/lib/payments/store";
import { buildPaymentSettlement, formatSettlementLog } from "@/lib/payments/settle";
import { getYooKassaPayment, isYooKassaConfigured } from "@/lib/payments/yookassa";
import { applyServerPaymentRewards } from "@/lib/payments/apply-rewards-server";
import { hashedClientKey, jsonError, readJsonBody } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type WebhookPayload = {
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
};

export async function POST(req: Request) {
  if (!isYooKassaConfigured()) {
    return jsonError("ЮKassa не настроена", 403);
  }

  const limited = rateLimit({
    key: `pay-hook:${hashedClientKey(req)}`,
    limit: 120,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<WebhookPayload>(req, 64_000);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);
  const payload = parsed.body;

  const object = payload.object;
  if (!object?.id || typeof object.id !== "string") {
    return NextResponse.json({ ok: true });
  }

  const yookassaId = object.id.trim().slice(0, 128);
  if (!yookassaId) {
    return NextResponse.json({ ok: true });
  }

  const paymentId =
    (typeof object.metadata?.paymentId === "string"
      ? object.metadata.paymentId.trim()
      : "") ||
    (await findPaymentByYookassaId(yookassaId))?.id;

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const verified = await getYooKassaPayment(yookassaId);
  if (!verified) {
    return jsonError("Не удалось проверить платёж", 400);
  }
  const status = verified.status;

  const intent = await getPaymentIntent(paymentId);
  if (
    intent &&
    status === "succeeded" &&
    Math.round(verified.amountRub) !== Math.round(intent.grossRub)
  ) {
    return jsonError("Amount mismatch", 409);
  }

  if (status === "succeeded") {
    if (intent && intent.status !== "succeeded") {
      const settlement = buildPaymentSettlement(intent.grossRub);
      await updatePaymentStatus(paymentId, "succeeded", {
        yookassaId,
      });
      await applyServerPaymentRewards({
        ...intent,
        status: "succeeded",
        yookassaId,
      });
      if (process.env.NODE_ENV === "development") {
        console.info(
          "[webhook] payment succeeded:",
          formatSettlementLog(intent.grossRub, settlement),
        );
      }
    } else if (intent) {
      await applyServerPaymentRewards(intent);
    }
  }

  if (status === "canceled") {
    await updatePaymentStatus(paymentId, "canceled", { yookassaId });
  }

  return NextResponse.json({ ok: true });
}
