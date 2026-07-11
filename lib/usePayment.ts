"use client";

import { useCallback, useState } from "react";
import type { BookingType } from "@/lib/bookings";

export type PaymentInput = {
  /** Paying fighter's profile id — server applies XP/session rewards to it. */
  fighterId?: string;
  trainerId: number;
  trainerName: string;
  gymName: string;
  date: string;
  time: string;
  trainingType: BookingType;
  grossRub?: number;
};

export type PaymentResult =
  | { ok: true; paymentId: string; mock: boolean }
  | { ok: false; message: string };

export const PAYMENT_API = {
  create: "/api/payment/create",
  webhook: "/api/payment/webhook",
  confirm: "/api/payment/confirm",
  mockPay: "/api/payment/mock-pay",
} as const;

export async function createPayment(input: PaymentInput): Promise<PaymentResult> {
  const res = await fetch(PAYMENT_API.create, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as {
    ok?: boolean;
    confirmationUrl?: string;
    paymentId?: string;
    mock?: boolean;
    message?: string;
  };

  if (!res.ok || !data.ok || !data.confirmationUrl || !data.paymentId) {
    return {
      ok: false,
      message: data.message ?? "Не удалось создать платёж",
    };
  }

  window.location.href = data.confirmationUrl;
  return { ok: true, paymentId: data.paymentId, mock: !!data.mock };
}

export function usePayment() {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = useCallback(async (input: PaymentInput) => {
    setPaying(true);
    setError(null);

    try {
      const result = await createPayment(input);
      if (!result.ok) {
        setError(result.message);
      }
      return result;
    } catch {
      const message = "Не удалось создать платёж. Попробуй ещё раз.";
      setError(message);
      return { ok: false as const, message };
    } finally {
      setPaying(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { paying, error, pay, clearError };
}
