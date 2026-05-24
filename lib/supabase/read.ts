import type { SupabaseClient } from "@supabase/supabase-js";
import { formatFighterLedgerName } from "@/lib/format-fighter";

function num(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  const n =
    typeof v === "string"
      ? Number.parseInt(v, 10)
      : typeof v === "number"
      ? v
      : NaN;

  return Number.isFinite(n) ? n : 0;
}

export type FighterHydrationPack = Readonly<{
  totalXp: number;
  careerGrossRub: number;
  careerCommissionRub: number;
  careerNetRub: number;
  sessionsCount: number;
}>;

/** Pull live XP ledger + sanctioned payout rolls for one combatant. */
export async function fetchFighterHydration(
  client: SupabaseClient,
  fighterDbId: string,
): Promise<FighterHydrationPack> {
  const [{ data: stats }, { data: lines }] = await Promise.all([
    client
      .from("fighter_stats")
      .select("total_xp")
      .eq("fighter_id", fighterDbId)
      .maybeSingle(),
    client
      .from("training_sessions")
      .select("gross_amount, commission, net_amount, total_xp_after")
      .eq("fighter_id", fighterDbId),
  ]);

  let careerGrossRub = 0;
  let careerCommissionRub = 0;
  let careerNetRub = 0;

  for (const row of lines ?? []) {
    careerGrossRub += num(row.gross_amount);
    careerCommissionRub += num(row.commission);
    careerNetRub += num(row.net_amount);
  }

  const xpFromStats = stats?.total_xp != null ? num(stats.total_xp) : null;

  const xpFromTrail =
    lines && lines.length
      ? Math.max(...lines.map((row) => num(row.total_xp_after)), 0)
      : null;

  const totalXp =
    xpFromStats != null
      ? Math.max(xpFromStats, xpFromTrail ?? 0)
      : xpFromTrail ?? 0;

  return {
    totalXp,
    careerGrossRub,
    careerCommissionRub,
    careerNetRub,
    sessionsCount: lines?.length ?? 0,
  };
}

export type LeaderboardRankRow = Readonly<{
  rank: number;
  fighterSlug: string;
  displayName: string;
  totalXp: number;
  workoutCount: number;
}>;

export async function fetchLeaderboardTopTen(
  client: SupabaseClient,
): Promise<LeaderboardRankRow[]> {
  const { data: statsRows, error: statsErr } = await client
    .from("fighter_stats")
    .select("fighter_id, total_xp")
    .order("total_xp", { ascending: false })
    .limit(10);

  if (statsErr || !statsRows?.length) return [];

  const ids = statsRows.map((r) => r.fighter_id).filter(Boolean);

  const { data: sessRows } = await client
    .from("training_sessions")
    .select("fighter_id")
    .in("fighter_id", ids);

  const tally = new Map<string, number>();

  for (const row of sessRows ?? []) {
    const id = row.fighter_id as string;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }

  return statsRows.map((row, i) => ({
    rank: i + 1,
    fighterSlug: row.fighter_id,
    displayName: formatFighterLedgerName(row.fighter_id),
    totalXp: num(row.total_xp),
    workoutCount: tally.get(row.fighter_id) ?? 0,
  }));
}
