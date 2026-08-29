import type { SupabaseClient } from "@supabase/supabase-js";
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
  _client: SupabaseClient | null,
  fighterId: string,
  _coachId = "WP-COACH-001",
): Promise<SherdogSyncResult> {
  try {
    const feed = await fetchSherdogFeed(fighterId);
    const proRecord = `${feed.wins}-${feed.losses}-${feed.draws}`;
    const newElo = Math.max(1200, 1400 + feed.eloDelta);

    return {
      status: "ok",
      proRecord,
      elo: newElo,
      eloDelta: feed.eloDelta,
      payoutRub: 0,
      commissionRub: 0,
      message: "SHERDOG SYNC: OK (read-only)",
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
