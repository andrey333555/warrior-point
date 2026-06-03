import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FighterAdvancerResult,
  SettlementBreakdown,
  TrainingSessionEconomyResult,
} from "@/lib/economy";

export type WarriorTrainingSyncPayload = {
  fighterId: string;
  economics: TrainingSessionEconomyResult;
  advancement: FighterAdvancerResult;
  /** Running monthly XP total to store (client maintains state, server records). */
  monthlyXpAfter?: number;
};

/**
 * Resilient upsert for `fighter_stats`.
 *
 * Some Supabase projects were created before migration 0001 added columns like
 * `monthly_xp`. If the upsert fails with a schema-cache miss we strip the
 * offending column and retry (up to 8 times).
 */
async function upsertFighterStats(
  client: SupabaseClient,
  stats: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  let payload = { ...stats };

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await client
      .from("fighter_stats")
      .upsert(payload, { onConflict: "fighter_id" });

    if (!error) return { error: null };

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss) {
      const col = miss[1];
      if (col in payload) {
        const { [col]: _dropped, ...rest } = payload;
        payload = rest;
        continue;
      }
    }

    return { error: new Error(error.message) };
  }

  return { error: new Error("Too many missing columns in fighter_stats — run migration 0001") };
}

/**
 * Resilient insert for `training_sessions`.
 *
 * On an un-migrated project some columns may not exist. We strip any column
 * that PostgREST rejects and retry — up to 12 times — so the record is always
 * saved with whatever columns are available.
 *
 * Once migration 0001 is applied the first attempt always succeeds.
 */
async function insertTrainingSession(
  client: SupabaseClient,
  row: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  let payload = { ...row };

  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await client.from("training_sessions").insert(payload);

    if (!error) return { error: null };

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss) {
      const col = miss[1];
      if (col in payload) {
        const { [col]: _dropped, ...rest } = payload;
        payload = rest;
        continue;
      }
    }

    return { error: new Error(error.message) };
  }

  return {
    error: new Error(
      "Too many missing columns in training_sessions. " +
        "Run migration 0001 in Supabase SQL Editor.",
    ),
  };
}

/** Persist ledger line + authoritative fighter aggregates (two-table model). */
export async function persistWarriorTrainingSession(
  client: SupabaseClient,
  payload: WarriorTrainingSyncPayload,
): Promise<{ error: Error | null }> {
  const { fighterId, economics, advancement, monthlyXpAfter } = payload;
  const breakdown: SettlementBreakdown = economics.breakdown;

  // 1. Upsert aggregated fighter stats (with monthly_xp if available).
  const statsRow: Record<string, unknown> = {
    fighter_id: fighterId,
    total_xp: advancement.totalXpAfter,
    current_level: advancement.levelAfter,
    updated_at: new Date().toISOString(),
  };

  if (monthlyXpAfter !== undefined) {
    statsRow.monthly_xp = monthlyXpAfter;
  }

  const { error: statsErr } = await upsertFighterStats(client, statsRow);
  if (statsErr) return { error: statsErr };

  // 2. Insert the raw session line (fallback drops unknown columns).
  const sessionRow: Record<string, unknown> = {
    fighter_id: fighterId,
    gross_amount: breakdown.gross,
    commission_pct: breakdown.commissionPct,
    commission: breakdown.commission,
    net_amount: breakdown.net,
    xp_awarded: economics.xpAward,
    level_before: advancement.levelBefore,
    level_after: advancement.levelAfter,
    total_xp_after: advancement.totalXpAfter,
    levels_gained: advancement.levelsJumped,
    currency: "RUB",
  };

  return insertTrainingSession(client, sessionRow);
}
