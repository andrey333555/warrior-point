import type { PaymentIntent, PaymentStatus } from "@/lib/payments/types";

type PaymentGlobal = typeof globalThis & {
  __wpPaymentStore?: Map<string, PaymentIntent>;
};

function getStore(): Map<string, PaymentIntent> {
  const g = globalThis as PaymentGlobal;
  if (!g.__wpPaymentStore) {
    g.__wpPaymentStore = new Map();
  }
  return g.__wpPaymentStore;
}

export function savePaymentIntent(intent: PaymentIntent): void {
  getStore().set(intent.id, intent);
}

export function getPaymentIntent(id: string): PaymentIntent | undefined {
  return getStore().get(id);
}

export function findPaymentByYookassaId(
  yookassaId: string,
): PaymentIntent | undefined {
  for (const intent of getStore().values()) {
    if (intent.yookassaId === yookassaId) return intent;
  }
  return undefined;
}

export function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  patch: Partial<PaymentIntent> = {},
): PaymentIntent | undefined {
  const current = getStore().get(id);
  if (!current) return undefined;

  const next: PaymentIntent = {
    ...current,
    ...patch,
    status,
    settledAt: status === "succeeded" ? new Date().toISOString() : current.settledAt,
  };
  getStore().set(id, next);
  return next;
}
