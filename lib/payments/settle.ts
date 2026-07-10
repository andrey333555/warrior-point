import { recordTrainingSessionRub, splitSettlement } from "@/lib/economy";
import { calculateCashback } from "@/lib/retention";
import type { PaymentSettlement } from "@/lib/payments/types";

export function buildPaymentSettlement(
  grossRub: number,
  opts: { isVIP?: boolean; streak?: number } = {},
): PaymentSettlement {
  const breakdown = splitSettlement(grossRub);
  const { xpAward } = recordTrainingSessionRub(grossRub);
  const cashbackRub = calculateCashback(
    grossRub,
    opts.isVIP ?? false,
    opts.streak ?? 0,
  );

  return {
    breakdown,
    cashbackRub,
    xpAward,
    trainerNetRub: breakdown.net,
    platformCommissionRub: breakdown.commission,
  };
}

export function formatSettlementLog(
  grossRub: number,
  settlement: PaymentSettlement,
): string {
  const { breakdown } = settlement;
  return [
    `Gross ${grossRub}₽`,
    `Platform 19% → ${breakdown.commission}₽`,
    `Trainer 81% → ${breakdown.net}₽`,
    `Cashback +${settlement.cashbackRub}₽`,
    `XP +${settlement.xpAward}`,
  ].join(" · ");
}
