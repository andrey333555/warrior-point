import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WARRIOR_WINNER_STATUS,
  currentWinnerPeriod,
} from "@/lib/admin";

export type MonthlyWinnerAward = Readonly<{
  fighterId: string;
  status: string;
  period: string;
  grantedAt: string;
}>;

/**
 * Promote a fighter to "Winner of the Month".
 *
 * Side-effects:
 *  1. Upserts `fighter_stats` with `is_winner = true`, `current_status` and
 *     `monthly_winner_at` so the passport UI (and any read paths) light up
 *     immediately.
 *  2. Appends an immutable row to `fighter_awards` for the audit trail.
 *     If that table hasn't been migrated yet we still keep the status save
 *     and surface a soft warning to the console.
 */
export async function grantMonthlyWinner(
  client: SupabaseClient,
  fighterId: string,
): Promise<{ data: MonthlyWinnerAward | null; error: Error | null }> {
  const grantedAt = new Date();
  const grantedAtIso = grantedAt.toISOString();
  const period = currentWinnerPeriod(grantedAt);

  const { error: statsErr } = await client
    .from("fighter_stats")
    .upsert(
      {
        fighter_id: fighterId,
        is_winner: true,
        current_status: WARRIOR_WINNER_STATUS,
        monthly_winner_at: grantedAtIso,
        updated_at: grantedAtIso,
      },
      { onConflict: "fighter_id" },
    );

  if (statsErr) {
    return { data: null, error: new Error(statsErr.message) };
  }

  const { error: awardErr } = await client.from("fighter_awards").insert({
    fighter_id: fighterId,
    kind: "monthly_winner",
    period,
    granted_at: grantedAtIso,
  });

  if (awardErr) {
    console.warn(
      "[Warrior Point] fighter_awards insert failed (status saved):",
      awardErr.message,
    );
  }

  return {
    data: {
      fighterId,
      status: WARRIOR_WINNER_STATUS,
      period,
      grantedAt: grantedAtIso,
    },
    error: null,
  };
}

/** Drop the Winner-of-the-Month status. */
export async function revokeMonthlyWinner(
  client: SupabaseClient,
  fighterId: string,
): Promise<{ error: Error | null }> {
  const { error } = await client
    .from("fighter_stats")
    .update({
      is_winner: false,
      current_status: null,
      monthly_winner_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("fighter_id", fighterId);

  return { error: error ? new Error(error.message) : null };
}

/** Idempotent toggle helper — used by the AgentsWindow row buttons. */
export async function setFighterWinner(
  client: SupabaseClient,
  fighterId: string,
  isWinner: boolean,
): Promise<{ data: MonthlyWinnerAward | null; error: Error | null }> {
  if (isWinner) return grantMonthlyWinner(client, fighterId);

  const { error } = await revokeMonthlyWinner(client, fighterId);

  return { data: null, error };
}
