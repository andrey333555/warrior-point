import type { SupabaseClient } from "@supabase/supabase-js";
import { splitSettlement } from "@/lib/economy";
import { RECENT_FIGHTS_MOCK } from "@/lib/mocks/recent-fights";

export type SherdogSyncStatus = "idle" | "syncing" | "ok" | "error";

export type SherdogSyncResult = {
  status: Exclude<SherdogSyncStatus, "idle" | "syncing">;
  proRecord: string;
  elo: number;
  eloDelta: number;
  payoutRub: number;
  commissionRub: number;
  message: string;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Simulated Sherdog / Tapology fight feed (800 ms latency). */
async function fetchSherdogFeed(
  fighterId: string,
): Promise<{
  wins: number;
  losses: number;
  draws: number;
  eloDelta: number;
  grossPayout: number;
}> {
  await new Promise((r) => setTimeout(r, 800));

  const latest = RECENT_FIGHTS_MOCK[0];
  const baseWins = fighterId.includes("441K") ? 26 : 8;
  const baseLosses = fighterId.includes("441K") ? 4 : 2;

  return {
    wins: latest.result === "W" ? baseWins + 1 : baseWins,
    losses: latest.result === "L" ? baseLosses + 1 : baseLosses,
    draws: 1,
    eloDelta: latest.eloDelta,
    grossPayout: latest.result === "W" ? 2000 : 0,
  };
}

/**
 * Post-fight Sherdog sync pipeline:
 *   1. Pull latest bout from external feed (simulated).
 *   2. Upsert pro record + ELO in `fighter_stats`.
 *   3. If win — settle honorarium (19% platform / 81% coach net).
 */
export async function syncWithSherdog(
  client: SupabaseClient,
  fighterId: string,
  coachId = "WP-COACH-001",
): Promise<SherdogSyncResult> {
  try {
    const feed = await fetchSherdogFeed(fighterId);
    const proRecord = `${feed.wins}-${feed.losses}-${feed.draws}`;

    const { data: statsRow } = await client
      .from("fighter_stats")
      .select("total_xp, wins, losses, draws, elo_rating")
      .eq("fighter_id", fighterId)
      .maybeSingle();

    const currentElo =
      typeof statsRow?.elo_rating === "number"
        ? statsRow.elo_rating
        : 1400 + Math.round(num(statsRow?.total_xp) / 12);

    const newElo = Math.max(1200, currentElo + feed.eloDelta);

    const statsPatch: Record<string, unknown> = {
      fighter_id: fighterId,
      wins: feed.wins,
      losses: feed.losses,
      draws: feed.draws,
      record_wins: feed.wins,
      record_losses: feed.losses,
      record_draws: feed.draws,
      elo_rating: newElo,
      updated_at: new Date().toISOString(),
    };

    let payload = { ...statsPatch };
    for (let i = 0; i < 8; i++) {
      const { error } = await client
        .from("fighter_stats")
        .upsert(payload, { onConflict: "fighter_id" });
      if (!error) break;
      const miss = error.message.match(/Could not find the '([^']+)' column/);
      if (miss && miss[1] in payload) {
        const { [miss[1]]: _d, ...rest } = payload;
        payload = rest;
        continue;
      }
      break;
    }

    let payoutRub = 0;
    let commissionRub = 0;

    if (feed.grossPayout > 0) {
      const breakdown = splitSettlement(feed.grossPayout);
      payoutRub = breakdown.net;
      commissionRub = breakdown.commission;

      const { data: coachProfile } = await client
        .from("profiles")
        .select("coach_earnings")
        .eq("id", coachId)
        .maybeSingle();

      if (coachProfile && "coach_earnings" in (coachProfile as object)) {
        await client
          .from("profiles")
          .update({
            coach_earnings: num(coachProfile.coach_earnings) + payoutRub,
            updated_at: new Date().toISOString(),
          })
          .eq("id", coachId);
      }

      await client.from("training_sessions").insert({
        fighter_id: fighterId,
        coach_id: coachId,
        gross_amount: breakdown.gross,
        commission_pct: breakdown.commissionPct,
        commission: breakdown.commission,
        net_amount: breakdown.net,
        session_status: "verified",
        session_type: "sherdog_payout",
        currency: "RUB",
      });
    }

    return {
      status: "ok",
      proRecord,
      elo: newElo,
      eloDelta: feed.eloDelta,
      payoutRub,
      commissionRub,
      message: "SHERDOG SYNC: OK",
    };
  } catch (err) {
    return {
      status: "error",
      proRecord: "—",
      elo: 0,
      eloDelta: 0,
      payoutRub: 0,
      commissionRub: 0,
      message: err instanceof Error ? err.message : "Sync failed",
    };
  }
}
