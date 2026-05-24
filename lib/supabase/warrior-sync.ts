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
};

/** Persist ledger line + authoritative fighter aggregates (two-table model). */
export async function persistWarriorTrainingSession(
  client: SupabaseClient,
  payload: WarriorTrainingSyncPayload,
): Promise<{ error: Error | null }> {
  const { fighterId, economics, advancement } = payload;
  const breakdown: SettlementBreakdown = economics.breakdown;

  const { error: upsertStatsError } = await client
    .from("fighter_stats")
    .upsert(
      {
        fighter_id: fighterId,
        total_xp: advancement.totalXpAfter,
        current_level: advancement.levelAfter,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "fighter_id" },
    );

  if (upsertStatsError) {
    return { error: new Error(upsertStatsError.message) };
  }

  const { error: insertSessionError } = await client
    .from("training_sessions")
    .insert({
      fighter_id: fighterId,
      gross_amount: breakdown.gross,
      commission_pct: breakdown.commissionPct,
      // Column is `commission` in Supabase (renamed away from `commission_amount`).
      commission: breakdown.commission,
      net_amount: breakdown.net,
      xp_awarded: economics.xpAward,
      level_before: advancement.levelBefore,
      level_after: advancement.levelAfter,
      total_xp_after: advancement.totalXpAfter,
      levels_gained: advancement.levelsJumped,
      currency: "RUB",
    });

  if (insertSessionError) {
    return { error: new Error(insertSessionError.message) };
  }

  return { error: null };
}
