import { splitSettlement } from "@/lib/economy";
import { buildSessionCompleteUrl } from "@/lib/session-complete";
import { createYooKassaPayment, isYooKassaConfigured } from "@/lib/payments/yookassa";
import { savePaymentIntent } from "@/lib/payments/store";
import type { CreatePaymentInput, PaymentIntent } from "@/lib/payments/types";

const DEFAULT_GROSS_RUB = 2000;

export type CreatePaymentResult =
  | {
      ok: true;
      paymentId: string;
      confirmationUrl: string;
      breakdown: ReturnType<typeof splitSettlement>;
      mock: boolean;
    }
  | { ok: false; message: string };

export async function createFightPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const grossRub = input.grossRub ?? DEFAULT_GROSS_RUB;
  const breakdown = splitSettlement(grossRub);
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const bookingId = `bk-${paymentId}`;
  const origin = input.origin ?? "http://localhost:3000";

  const returnUrl = new URL(
    buildSessionCompleteUrl(input.trainerId, origin),
  );
  returnUrl.searchParams.set("paymentId", paymentId);
  returnUrl.searchParams.set("type", input.trainingType);
  returnUrl.searchParams.set("bookingId", bookingId);
  returnUrl.searchParams.set("trainer", input.trainerName);
  returnUrl.searchParams.set("gym", input.gymName);
  returnUrl.searchParams.set("gross", String(grossRub));

  const intent: PaymentIntent = {
    id: paymentId,
    status: "pending",
    fighterId: input.fighterId,
    trainerId: input.trainerId,
    trainerName: input.trainerName,
    gymName: input.gymName,
    date: input.date,
    time: input.time,
    trainingType: input.trainingType,
    grossRub,
    breakdown,
    bookingId,
    createdAt: new Date().toISOString(),
  };

  await savePaymentIntent(intent);

  const description = `Round 23 · ${input.trainingType} · ${input.trainerName}`;
  const metadata = {
    paymentId,
    trainerId: String(input.trainerId),
    bookingId,
  };

  if (isYooKassaConfigured()) {
    try {
      const yk = await createYooKassaPayment({
        paymentId,
        grossRub,
        description,
        returnUrl: returnUrl.toString(),
        metadata,
      });
      if (!yk) {
        return { ok: false, message: "ЮKassa не настроена" };
      }

      intent.yookassaId = yk.yookassaId;
      await savePaymentIntent(intent);

      return {
        ok: true,
        paymentId,
        confirmationUrl: yk.confirmationUrl,
        breakdown,
        mock: false,
      };
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error ? err.message : "Не удалось создать платёж",
      };
    }
  }

  return {
    ok: true,
    paymentId,
    confirmationUrl: returnUrl.toString(),
    breakdown,
    mock: true,
  };
}
