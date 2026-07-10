import { NextResponse } from "next/server";
import { buildSessionCompleteUrl } from "@/lib/session-complete";
import {
  getPaymentIntent,
  updatePaymentStatus,
} from "@/lib/payments/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const intent = getPaymentIntent(paymentId);
  if (!intent) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (intent.status !== "succeeded") {
    updatePaymentStatus(paymentId, "succeeded");
  }

  const returnUrl = new URL(
    buildSessionCompleteUrl(intent.trainerId, new URL(req.url).origin),
  );
  returnUrl.searchParams.set("paymentId", paymentId);
  returnUrl.searchParams.set("bookingId", intent.bookingId);
  returnUrl.searchParams.set("type", intent.trainingType);
  returnUrl.searchParams.set("trainer", intent.trainerName);

  return NextResponse.redirect(returnUrl);
}
