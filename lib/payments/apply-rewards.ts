"use client";

import { addBooking, completeBooking, BOOKING_TYPE_LABEL } from "@/lib/bookings";
import { awardTrainingXp } from "@/lib/xp";
import {
  creditWalletCashback,
  markPaymentApplied,
  wasPaymentApplied,
} from "@/lib/wallet-store";

type ConfirmResponse = {
  ok: boolean;
  trainerId?: number;
  trainerName?: string;
  gymName?: string;
  trainingType?: string;
  settlement?: {
    cashbackRub: number;
    xpAward: number;
    trainerNetRub: number;
    platformCommissionRub: number;
  };
};

export type ApplyPaymentRewardsResult = {
  applied: boolean;
  xpAward?: number;
  cashbackRub?: number;
  trainerNetRub?: number;
  platformCommissionRub?: number;
};

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

  const label = BOOKING_TYPE_LABEL[typeKey];
  awardTrainingXp(`${label} · ${data.trainerName ?? "Тренер"}`);
  creditWalletCashback(data.settlement.cashbackRub);
  markPaymentApplied(paymentId);

  return {
    applied: true,
    xpAward: data.settlement.xpAward,
    cashbackRub: data.settlement.cashbackRub,
    trainerNetRub: data.settlement.trainerNetRub,
    platformCommissionRub: data.settlement.platformCommissionRub,
  };
}
