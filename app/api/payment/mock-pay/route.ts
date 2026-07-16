import { NextResponse } from "next/server";
import { buildSessionCompleteUrl } from "@/lib/session-complete";
import { isYooKassaConfigured } from "@/lib/payments/yookassa";
import {
  getPaymentIntent,
  updatePaymentStatus,
} from "@/lib/payments/store";
import { applyServerPaymentRewards } from "@/lib/payments/apply-rewards-server";

export async function GET(req: Request) {
  // Mock-pay is a demo shortcut. The moment real YooKassa credentials exist,
  // this route must not be able to mark anything as paid.
  if (isYooKassaConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Mock payment disabled" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const intent = await getPaymentIntent(paymentId);
  if (!intent) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (intent.status !== "succeeded") {
    await updatePaymentStatus(paymentId, "succeeded");
    void applyServerPaymentRewards(intent).catch((err) => {
      console.warn("[payments] mock-pay server rewards:", err);
    });
  }

  const returnUrl = new URL(
    buildSessionCompleteUrl(intent.trainerId, new URL(req.url).origin),
  );
  returnUrl.searchParams.set("paymentId", paymentId);
  returnUrl.searchParams.set("bookingId", intent.bookingId);
  returnUrl.searchParams.set("type", intent.trainingType);
  returnUrl.searchParams.set("trainer", intent.trainerName);
  returnUrl.searchParams.set("gym", intent.gymName);
  returnUrl.searchParams.set("gross", String(intent.grossRub));

  return NextResponse.redirect(returnUrl);
}
