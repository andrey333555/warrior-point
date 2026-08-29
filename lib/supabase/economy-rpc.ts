import type { SupabaseClient } from "@supabase/supabase-js";
import { donateSettlement, recordTrainingSessionRub } from "@/lib/economy";
import { isLiveEconomyLocked } from "@/lib/api-session";
import { recordServerTrainingSession } from "@/lib/supabase/session-server";
import { safeDbMessage } from "@/lib/api-request";

type RpcRow = Record<string, unknown>;

function bool(v: unknown): boolean {
  return v === true;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function firstRow(data: unknown): RpcRow | null {
  if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
    return data[0] as RpcRow;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as RpcRow;
  }
  return null;
}

function isMissingRpc(message: string): boolean {
  return /could not find the function|schema cache|does not exist|42883/i.test(
    message,
  );
}

export type PaymentRewardRpc =
  | {
      ok: true;
      alreadyGranted: boolean;
      xpAwarded: number;
      cashbackRub: number;
      grossRub: number;
      fighterId: string;
      totalXpAfter: number;
      levelAfter: number;
    }
  | { ok: false; status: number; message: string };

export async function rpcApplyPaymentRewards(
  client: SupabaseClient,
  paymentId: string,
): Promise<PaymentRewardRpc> {
  const { data, error } = await client.rpc("apply_payment_rewards", {
    p_payment_id: paymentId,
  });

  if (error) {
    if (isMissingRpc(error.message)) {
      if (isLiveEconomyLocked()) {
        return {
          ok: false,
          status: 503,
          message: "Сервер не готов · примените миграцию 0023",
        };
      }
      return {
        ok: false,
        status: 503,
        message: "Нужна миграция 0023 для начисления за оплату",
      };
    }
    return { ok: false, status: 502, message: safeDbMessage(error.message) };
  }

  const row = firstRow(data);
  if (!row) {
    return { ok: false, status: 502, message: "Пустой ответ начисления" };
  }

  if (!bool(row.ok)) {
    const msg = str(row.message);
    const status = /not found/i.test(msg)
      ? 404
      : /not succeeded|missing fighter/i.test(msg)
        ? 402
        : 400;
    return { ok: false, status, message: safeDbMessage(msg) };
  }

  return {
    ok: true,
    alreadyGranted: bool(row.already_granted),
    xpAwarded: num(row.xp_awarded),
    cashbackRub: num(row.cashback_rub),
    grossRub: num(row.gross_rub),
    fighterId: str(row.fighter_id),
    totalXpAfter: num(row.total_xp_after),
    levelAfter: num(row.level_after),
  };
}

export type TrainingOnceRpc =
  | {
      ok: true;
      alreadyGranted: boolean;
      xpAwarded: number;
      totalXpAfter: number;
      levelBefore: number;
      levelAfter: number;
      monthlyXpAfter: number;
    }
  | { ok: false; status: number; message: string };

export async function rpcRecordTrainingOnce(
  client: SupabaseClient,
  opts: {
    fighterId: string;
    grossRub: number;
    source: string;
    sourceId: string;
    sessionType?: string;
    createdAt?: string;
    paymentId?: string;
    fixationSessionKey?: string;
    splitBookingId?: string;
    coachId?: string;
  },
): Promise<TrainingOnceRpc> {
  const { data, error } = await client.rpc("wp_record_training_once", {
    p_fighter_id: opts.fighterId,
    p_gross_rub: Math.round(opts.grossRub),
    p_source: opts.source,
    p_source_id: opts.sourceId,
    p_session_type: opts.sessionType ?? "training",
    p_created_at: opts.createdAt ?? new Date().toISOString(),
    p_payment_id: opts.paymentId ?? null,
    p_fixation_session_key: opts.fixationSessionKey ?? null,
    p_split_booking_id: opts.splitBookingId ?? null,
    p_coach_id: opts.coachId ?? null,
  });

  if (error) {
    if (isMissingRpc(error.message)) {
      if (isLiveEconomyLocked()) {
        return {
          ok: false,
          status: 503,
          message: "Сервер не готов · примените миграцию 0023",
        };
      }
      const fallback = await recordServerTrainingSession(client, {
        fighterId: opts.fighterId,
        grossRub: opts.grossRub,
        sessionType: opts.sessionType,
        createdAt: opts.createdAt,
      });
      if (!fallback.ok) {
        return { ok: false, status: 502, message: safeDbMessage(fallback.message) };
      }
      return {
        ok: true,
        alreadyGranted: false,
        xpAwarded: fallback.economics.xpAward,
        totalXpAfter: fallback.advancement.totalXpAfter,
        levelBefore: fallback.advancement.levelBefore,
        levelAfter: fallback.advancement.levelAfter,
        monthlyXpAfter: fallback.monthlyXpAfter,
      };
    }
    return { ok: false, status: 502, message: safeDbMessage(error.message) };
  }

  const row = firstRow(data);
  if (!row) {
    return { ok: false, status: 502, message: "Пустой ответ начисления" };
  }
  if (!bool(row.ok)) {
    return { ok: false, status: 400, message: safeDbMessage(str(row.message)) };
  }

  return {
    ok: true,
    alreadyGranted: bool(row.already_granted),
    xpAwarded: num(row.xp_awarded),
    totalXpAfter: num(row.total_xp_after),
    levelBefore: num(row.level_before),
    levelAfter: num(row.level_after),
    monthlyXpAfter: num(row.monthly_xp_after),
  };
}

export type BookSplitRpc =
  | {
      ok: true;
      bookedCount: number;
      activated: boolean;
      newBalance: number;
      dailyStreak: number;
      iphoneTickets: number;
      xpAwarded: number;
    }
  | { ok: false; code: string; message: string };

export async function rpcBookSplit(
  client: SupabaseClient,
  opts: { clientId: string; splitId: string; grossRub?: number },
): Promise<BookSplitRpc> {
  const { data, error } = await client.rpc("book_split_atomic", {
    p_client_id: opts.clientId,
    p_split_id: opts.splitId,
    p_gross_rub: opts.grossRub ?? 2000,
  });

  if (error) {
    if (isMissingRpc(error.message) && isLiveEconomyLocked()) {
      return {
        ok: false,
        code: "DB_ERROR",
        message: "Сервер не готов · примените миграцию 0023",
      };
    }
    return { ok: false, code: "DB_ERROR", message: safeDbMessage(error.message) };
  }

  const row = firstRow(data);
  if (!row) {
    return { ok: false, code: "DB_ERROR", message: "Пустой ответ брони" };
  }
  if (!bool(row.ok)) {
    return {
      ok: false,
      code: str(row.code) || "DB_ERROR",
      message: safeDbMessage(str(row.message)),
    };
  }

  return {
    ok: true,
    bookedCount: num(row.booked_count),
    activated: bool(row.activated),
    newBalance: num(row.new_balance),
    dailyStreak: num(row.daily_streak),
    iphoneTickets: num(row.iphone_tickets),
    xpAwarded: num(row.xp_awarded),
  };
}

export type WalletDonateRpc =
  | {
      ok: true;
      donationId: string;
      newDonorBalance: number;
      breakdown: ReturnType<typeof donateSettlement>;
    }
  | { ok: false; code: string; message: string };

export async function rpcWalletDonate(
  client: SupabaseClient,
  opts: {
    donorId: string;
    recipientId: string;
    grossRub: number;
    comment?: string;
  },
): Promise<WalletDonateRpc> {
  const { data, error } = await client.rpc("wallet_donate_atomic", {
    p_donor_id: opts.donorId,
    p_recipient_id: opts.recipientId,
    p_gross_rub: Math.round(opts.grossRub),
    p_comment: opts.comment ?? null,
  });

  if (error) {
    if (isMissingRpc(error.message) && isLiveEconomyLocked()) {
      return {
        ok: false,
        code: "DB_ERROR",
        message: "Сервер не готов · примените миграцию 0023",
      };
    }
    return { ok: false, code: "DB_ERROR", message: safeDbMessage(error.message) };
  }

  const row = firstRow(data);
  if (!row) {
    return { ok: false, code: "DB_ERROR", message: "Пустой ответ доната" };
  }
  if (!bool(row.ok)) {
    return {
      ok: false,
      code: str(row.code) || "DB_ERROR",
      message: safeDbMessage(str(row.message)),
    };
  }

  return {
    ok: true,
    donationId: str(row.donation_id),
    newDonorBalance: num(row.new_donor_balance),
    breakdown: donateSettlement(opts.grossRub),
  };
}

export function trainingEconomicsFromGross(grossRub: number) {
  return recordTrainingSessionRub(grossRub);
}
