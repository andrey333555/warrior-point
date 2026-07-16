import type { PaymentIntent, PaymentStatus } from "@/lib/payments/types";
import type { SettlementBreakdown } from "@/lib/economy";
import {
  createWarriorServiceClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/server-admin";

// ── In-memory fallback (local dev / demo without service role) ───────────────

type PaymentGlobal = typeof globalThis & {
  __wpPaymentStore?: Map<string, PaymentIntent>;
};

function memStore(): Map<string, PaymentIntent> {
  const g = globalThis as PaymentGlobal;
  if (!g.__wpPaymentStore) {
    g.__wpPaymentStore = new Map();
  }
  return g.__wpPaymentStore;
}

const TABLE = "payment_intents";

// ── Row ↔ intent mapping ─────────────────────────────────────────────────────

type PaymentRow = {
  id: string;
  yookassa_id: string | null;
  status: PaymentStatus;
  fighter_id: string | null;
  trainer_id: number;
  trainer_name: string;
  gym_name: string;
  session_date: string;
  session_time: string;
  training_type: string;
  gross_rub: number;
  booking_id: string;
  breakdown: SettlementBreakdown | null;
  created_at: string;
  settled_at: string | null;
};

function toRow(intent: PaymentIntent): PaymentRow {
  return {
    id: intent.id,
    yookassa_id: intent.yookassaId ?? null,
    status: intent.status,
    fighter_id: intent.fighterId ?? null,
    trainer_id: intent.trainerId,
    trainer_name: intent.trainerName,
    gym_name: intent.gymName,
    session_date: intent.date,
    session_time: intent.time,
    training_type: intent.trainingType,
    gross_rub: intent.grossRub,
    booking_id: intent.bookingId,
    breakdown: intent.breakdown,
    created_at: intent.createdAt,
    settled_at: intent.settledAt ?? null,
  };
}

function fromRow(row: PaymentRow): PaymentIntent {
  return {
    id: row.id,
    yookassaId: row.yookassa_id ?? undefined,
    status: row.status,
    fighterId: row.fighter_id ?? undefined,
    trainerId: row.trainer_id,
    trainerName: row.trainer_name,
    gymName: row.gym_name,
    date: row.session_date,
    time: row.session_time,
    trainingType: row.training_type as PaymentIntent["trainingType"],
    grossRub: row.gross_rub,
    breakdown: row.breakdown as SettlementBreakdown,
    bookingId: row.booking_id,
    createdAt: row.created_at,
    settledAt: row.settled_at ?? undefined,
  };
}

// ── Public API (async) ───────────────────────────────────────────────────────

export async function savePaymentIntent(intent: PaymentIntent): Promise<void> {
  memStore().set(intent.id, intent);

  if (isServiceRoleConfigured()) {
    const client = createWarriorServiceClient();
    if (client) {
      const { error } = await client.from(TABLE).upsert(toRow(intent), {
        onConflict: "id",
      });
      if (!error) return;
      if (process.env.NODE_ENV === "development") {
        console.warn("[payments] persist failed, using memory:", error.message);
      }
    }
  }
}

export async function getPaymentIntent(
  id: string,
): Promise<PaymentIntent | undefined> {
  const cached = memStore().get(id);
  if (cached) return cached;

  if (isServiceRoleConfigured()) {
    const client = createWarriorServiceClient();
    if (client) {
      const { data, error } = await client
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        const intent = fromRow(data as PaymentRow);
        memStore().set(id, intent);
        return intent;
      }
    }
  }
  return undefined;
}

export async function findPaymentByYookassaId(
  yookassaId: string,
): Promise<PaymentIntent | undefined> {
  if (isServiceRoleConfigured()) {
    const client = createWarriorServiceClient();
    if (client) {
      const { data, error } = await client
        .from(TABLE)
        .select("*")
        .eq("yookassa_id", yookassaId)
        .maybeSingle();
      if (!error) return data ? fromRow(data as PaymentRow) : undefined;
    }
  }
  for (const intent of memStore().values()) {
    if (intent.yookassaId === yookassaId) return intent;
  }
  return undefined;
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  patch: Partial<PaymentIntent> = {},
): Promise<PaymentIntent | undefined> {
  const current = await getPaymentIntent(id);
  if (!current) return undefined;

  const next: PaymentIntent = {
    ...current,
    ...patch,
    status,
    settledAt:
      status === "succeeded" ? new Date().toISOString() : current.settledAt,
  };

  await savePaymentIntent(next);
  return next;
}
