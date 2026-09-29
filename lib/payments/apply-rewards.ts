"use client";

import { addBooking, completeBooking, type BookingType } from "@/lib/bookings";
import {
  markPaymentApplied,
  wasPaymentApplied,
} from "@/lib/wallet-store";

type ConfirmResponse = {
  ok: boolean;
  bookingId?: string;
  trainerId?: number;
  trainerName?: string;
  gymName?: string;
  trainingType?: string;
  grossRub?: number;
  settlement?: {
    cashbackRub: number;
    xpAward: number;
    trainerNetRub: number;
    platformCommissionRub: number;
  };
};

export type ApplyPaymentRewardsResult = {
  applied: boolean;
  bookingId?: string;
  trainerId?: number;
  trainerName?: string;
  gymName?: string;
  trainingType?: BookingType;
  grossRub?: number;
  xpAward?: number;
  cashbackRub?: number;
  trainerNetRub?: number;
  platformCommissionRub?: number;
};

/** Display-only: server already minted XP/cashback. */
export async function applyPaymentRewards(
  paymentId: string,
): Promise<ApplyPaymentRewardsResult> {
  if (wasPaymentApplied(paymentId)) {
    return { applied: false };
  }

  const res = await fetch("/api/payment/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId }),
  });

  const data = (await res.json()) as ConfirmResponse;
  if (!res.ok || !data.ok || !data.settlement) {
    return { applied: false };
  }

  void fetch("/api/session/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId }),
  }).catch(() => undefined);

  const typeKey =
    data.trainingType === "individual" ||
    data.trainingType === "group" ||
    data.trainingType === "split"
      ? data.trainingType
      : "split";

  const booking = addBooking({
    trainerId: data.trainerId ?? 1,
    trainerName: data.trainerName ?? "Тренер",
    gymName: data.gymName ?? "Зал",
    date: "Сегодня",
    time: "—",
    type: typeKey,
  });

  completeBooking(booking.id);
  markPaymentApplied(paymentId);

  return {
    applied: true,
    bookingId: data.bookingId,
    trainerId: data.trainerId,
    trainerName: data.trainerName,
    gymName: data.gymName,
    trainingType: typeKey,
    grossRub: data.grossRub,
    xpAward: data.settlement.xpAward,
    cashbackRub: data.settlement.cashbackRub,
    trainerNetRub: data.settlement.trainerNetRub,
    platformCommissionRub: data.settlement.platformCommissionRub,
  };
}
