import { findTrainer } from "@/lib/network";
import { INSURANCE_PLANS } from "@/lib/insurance";

export type PriceValidation =
  | { ok: true; grossRub: number }
  | { ok: false; message: string };

/**
 * Server-side price guard. The client sends `grossRub`, but we never trust it:
 * the amount must equal one of the trainer's own training prices, optionally
 * plus a known insurance add-on. Blocks "pay 1 ₽" tampering.
 */
export function validateGrossRub(
  trainerId: number,
  grossRub: unknown,
): PriceValidation {
  if (typeof grossRub !== "number" || !Number.isFinite(grossRub) || grossRub <= 0) {
    return { ok: false, message: "Некорректная сумма" };
  }

  const trainer = findTrainer(trainerId);
  if (!trainer) {
    return { ok: false, message: "Тренер не найден" };
  }

  const insuranceOptions = [0, ...INSURANCE_PLANS.map((p) => p.price)];
  const allowed = new Set<number>();
  for (const training of trainer.trainings) {
    for (const ins of insuranceOptions) {
      allowed.add(training.price + ins);
    }
  }

  if (!allowed.has(Math.round(grossRub))) {
    return { ok: false, message: "Сумма не совпадает с ценой тренера" };
  }

  return { ok: true, grossRub: Math.round(grossRub) };
}
