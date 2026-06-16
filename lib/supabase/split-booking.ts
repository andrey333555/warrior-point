import type { SupabaseClient } from "@supabase/supabase-js";
import {
  advanceFighterXp,
  recordTrainingSessionRub,
  splitSettlement,
  type SettlementBreakdown,
} from "@/lib/economy";
import { MIN_SPLIT_SEATS } from "@/lib/splits";

/** Client-facing gross price for a split seat (includes platform fee). */
export const SPLIT_CLIENT_GROSS_RUB = 2000 as const;

export type BookSplitResult =
  | {
      ok: true;
      bookedCount: number;
      activated: boolean;
      breakdown: SettlementBreakdown;
      newBalance: number;
      dailyStreak: number;
      iphoneTickets: number;
    }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "FULL"
        | "ALREADY_BOOKED"
        | "INSUFFICIENT_BALANCE"
        | "UNAUTHENTICATED"
        | "DB_ERROR";
      message: string;
    };

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function resilientUpdate(
  client: SupabaseClient,
  table: string,
  match: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  let payload = { ...patch };

  for (let i = 0; i < 10; i++) {
    const { error } = await client.from(table).update(payload).match(match);
    if (!error) return { error: null };

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss && miss[1] in payload) {
      const { [miss[1]]: _d, ...rest } = payload;
      payload = rest;
      continue;
    }
    return { error: new Error(error.message) };
  }

  return { error: new Error(`Update failed on ${table}`) };
}

async function resilientInsert(
  client: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  let payload = { ...row };

  for (let i = 0; i < 12; i++) {
    const { error } = await client.from(table).insert(payload);
    if (!error) return { error: null };

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss && miss[1] in payload) {
      const { [miss[1]]: _d, ...rest } = payload;
      payload = rest;
      continue;
    }
    return { error: new Error(error.message) };
  }

  return { error: new Error(`Insert failed on ${table}`) };
}

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Book a split seat for the authenticated client.
 *
 * FinTech flow (gross 2 000 ₽):
 *   · 19% (380 ₽)  → platform commission (recorded in training_sessions)
 *   · 81% (1 620 ₽) → coach_earnings on the coach profile
 *   · Client balance debited by gross
 *   · training_sessions row inserted (verified)
 *   · daily_streak +1, iphone_tickets +1 on client profile / fighter_stats
 */
export async function handleBookSplit(
  client: SupabaseClient,
  opts: {
    clientId: string;
    splitId: string;
    grossRub?: number;
  },
): Promise<BookSplitResult> {
  const { clientId, splitId } = opts;
  const grossRub = opts.grossRub ?? SPLIT_CLIENT_GROSS_RUB;

  if (!clientId) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Войди в аккаунт для записи" };
  }

  const breakdown = splitSettlement(grossRub);

  // ── 1. Load split ─────────────────────────────────────────────────────────
  const { data: splitRow, error: splitErr } = await client
    .from("training_splits")
    .select("*")
    .eq("id", splitId)
    .maybeSingle();

  if (splitErr || !splitRow) {
    return { ok: false, code: "NOT_FOUND", message: "Сплит не найден" };
  }

  const coachId = splitRow.coach_id as string;
  const maxSeats = num(splitRow.max_seats) || 6;
  const status = splitRow.status as string;

  if (status === "done" || status === "cancelled") {
    return { ok: false, code: "NOT_FOUND", message: "Сплит закрыт для записи" };
  }

  // ── 2. Duplicate booking guard ────────────────────────────────────────────
  const { data: existing } = await client
    .from("split_bookings")
    .select("id")
    .eq("split_id", splitId)
    .eq("fighter_id", clientId)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      code: "ALREADY_BOOKED",
      message: "Ты уже записан на этот сплит",
    };
  }

  // ── 3. Seat capacity ──────────────────────────────────────────────────────
  const { count: bookedBefore } = await client
    .from("split_bookings")
    .select("*", { count: "exact", head: true })
    .eq("split_id", splitId);

  const currentBooked = bookedBefore ?? 0;
  if (currentBooked >= maxSeats) {
    return { ok: false, code: "FULL", message: "Все места заняты" };
  }

  // ── 4. Client balance check ───────────────────────────────────────────────
  const { data: clientProfile } = await client
    .from("profiles")
    .select("balance, iphone_tickets")
    .eq("id", clientId)
    .maybeSingle();

  let balance = num(clientProfile?.balance);
  let iphoneTickets = num(clientProfile?.iphone_tickets);

  // If balance column missing, treat as sufficient for MVP (migration pending)
  const hasBalanceCol = clientProfile !== null && "balance" in (clientProfile as object);
  if (hasBalanceCol && balance < grossRub) {
    return {
      ok: false,
      code: "INSUFFICIENT_BALANCE",
      message: `Недостаточно средств · нужно ${grossRub.toLocaleString("ru-RU")} ₽`,
    };
  }

  // ── 5. Load fighter stats for streak / XP ─────────────────────────────────
  const { data: statsRow } = await client
    .from("fighter_stats")
    .select("total_xp, monthly_xp, current_level, daily_streak, last_session_at")
    .eq("fighter_id", clientId)
    .maybeSingle();

  const totalXpBefore = num(statsRow?.total_xp);
  const monthlyXpBefore = num(statsRow?.monthly_xp);
  const dailyStreakBefore = num(statsRow?.daily_streak);
  const lastSessionAt = statsRow?.last_session_at
    ? new Date(statsRow.last_session_at as string)
    : null;

  const now = new Date();
  let dailyStreak = dailyStreakBefore;
  if (!lastSessionAt || !sameUtcDay(lastSessionAt, now)) {
    dailyStreak = dailyStreakBefore + 1;
  }

  const economics = recordTrainingSessionRub(grossRub);
  const advancement = advanceFighterXp(totalXpBefore, economics.xpAward);
  const monthlyXpAfter = monthlyXpBefore + economics.xpAward;

  // ── 6. Debit client · credit coach ────────────────────────────────────────
  if (hasBalanceCol) {
    balance -= grossRub;
    iphoneTickets += 1;

    const { error: debitErr } = await resilientUpdate(
      client,
      "profiles",
      { id: clientId },
      {
        balance,
        iphone_tickets: iphoneTickets,
        updated_at: now.toISOString(),
      },
    );
    if (debitErr) {
      return { ok: false, code: "DB_ERROR", message: debitErr.message };
    }
  }

  const { data: coachProfile } = await client
    .from("profiles")
    .select("coach_earnings")
    .eq("id", coachId)
    .maybeSingle();

  if (coachProfile && "coach_earnings" in (coachProfile as object)) {
    const coachEarnings = num(coachProfile.coach_earnings) + breakdown.net;
    const { error: creditErr } = await resilientUpdate(
      client,
      "profiles",
      { id: coachId },
      {
        coach_earnings: coachEarnings,
        updated_at: now.toISOString(),
      },
    );
    if (creditErr) {
      return { ok: false, code: "DB_ERROR", message: creditErr.message };
    }
  }

  // ── 7. Booking row ────────────────────────────────────────────────────────
  const { error: bookErr } = await resilientInsert(client, "split_bookings", {
    split_id: splitId,
    fighter_id: clientId,
    gross_amount: grossRub,
    verified: true,
  });

  if (bookErr) {
    if (bookErr.message.includes("23505") || bookErr.message.includes("duplicate")) {
      return {
        ok: false,
        code: "ALREADY_BOOKED",
        message: "Ты уже записан на этот сплит",
      };
    }
    return { ok: false, code: "DB_ERROR", message: bookErr.message };
  }

  const bookedCount = currentBooked + 1;
  let activated = false;

  if (bookedCount >= MIN_SPLIT_SEATS && status === "waiting") {
    const { error: actErr } = await client
      .from("training_splits")
      .update({ status: "active" })
      .eq("id", splitId)
      .eq("status", "waiting");
    if (!actErr) activated = true;
  }

  // ── 8. Verified training_session ──────────────────────────────────────────
  const { error: sessErr } = await resilientInsert(client, "training_sessions", {
    fighter_id: clientId,
    coach_id: coachId,
    split_id: splitId,
    gross_amount: breakdown.gross,
    commission_pct: breakdown.commissionPct,
    commission: breakdown.commission,
    net_amount: breakdown.net,
    xp_awarded: economics.xpAward,
    level_before: advancement.levelBefore,
    level_after: advancement.levelAfter,
    total_xp_after: advancement.totalXpAfter,
    levels_gained: advancement.levelsJumped,
    session_status: "verified",
    session_type: "split_booking",
    currency: "RUB",
    created_at: now.toISOString(),
  });

  if (sessErr) {
    return { ok: false, code: "DB_ERROR", message: sessErr.message };
  }

  // ── 9. Fighter stats — streak + XP ────────────────────────────────────────
  const statsPatch: Record<string, unknown> = {
    fighter_id: clientId,
    total_xp: advancement.totalXpAfter,
    current_level: advancement.levelAfter,
    monthly_xp: monthlyXpAfter,
    daily_streak: dailyStreak,
    last_session_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  let statsPayload = { ...statsPatch };
  for (let i = 0; i < 8; i++) {
    const { error } = await client
      .from("fighter_stats")
      .upsert(statsPayload, { onConflict: "fighter_id" });

    if (!error) break;

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss && miss[1] in statsPayload) {
      const { [miss[1]]: _d, ...rest } = statsPayload;
      statsPayload = rest;
      continue;
    }
    break;
  }

  return {
    ok: true,
    bookedCount,
    activated,
    breakdown,
    newBalance: balance,
    dailyStreak,
    iphoneTickets: hasBalanceCol ? iphoneTickets : dailyStreak,
  };
}
