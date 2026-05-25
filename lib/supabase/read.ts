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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type FighterHydrationPack = Readonly<{
  totalXp: number;
  careerGrossRub: number;
  careerCommissionRub: number;
  careerNetRub: number;
  sessionsCount: number;
  xp30d: number;
  sessions30d: number;
  currentStatus: string | null;
  monthlyWinnerAt: string | null;
  isWinner: boolean;
}>;

/** Pull live XP ledger + sanctioned payout rolls for one combatant. */
export async function fetchFighterHydration(
  client: SupabaseClient,
  fighterDbId: string,
): Promise<FighterHydrationPack> {
  const [statsRes, linesRes] = await Promise.all([
    client
      .from("fighter_stats")
      .select("total_xp, current_status, is_winner, monthly_winner_at")
      .eq("fighter_id", fighterDbId)
      .maybeSingle(),
    client
      .from("training_sessions")
      .select(
        "gross_amount, commission, net_amount, total_xp_after, xp_awarded, created_at",
      )
      .eq("fighter_id", fighterDbId),
  ]);

  // If the migration adding `current_status` / `is_winner` / `monthly_winner_at`
  // hasn't been applied yet, fall back to a legacy select so the passport still
  // hydrates.
  let stats: {
    total_xp?: unknown;
    current_status?: unknown;
    is_winner?: unknown;
    monthly_winner_at?: unknown;
  } | null = statsRes.data ?? null;

  if (statsRes.error && /column .* does not exist/i.test(statsRes.error.message ?? "")) {
    const legacy = await client
      .from("fighter_stats")
      .select("total_xp")
      .eq("fighter_id", fighterDbId)
      .maybeSingle();

    stats = legacy.data ?? null;
  }

  const lines = linesRes.data ?? [];

  let careerGrossRub = 0;
  let careerCommissionRub = 0;
  let careerNetRub = 0;
  let xp30d = 0;
  let sessions30d = 0;

  const cutoff = Date.now() - THIRTY_DAYS_MS;

  for (const row of lines) {
    careerGrossRub += num(row.gross_amount);
    careerCommissionRub += num(row.commission);
    careerNetRub += num(row.net_amount);

    const createdAt =
      typeof row.created_at === "string" ? Date.parse(row.created_at) : NaN;

    if (Number.isFinite(createdAt) && createdAt >= cutoff) {
      xp30d += num(row.xp_awarded);
      sessions30d += 1;
    }
  }

  const xpFromStats = stats?.total_xp != null ? num(stats.total_xp) : null;
  const xpFromTrail = lines.length
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
    sessionsCount: lines.length,
    xp30d,
    sessions30d,
    currentStatus:
      typeof stats?.current_status === "string" ? stats.current_status : null,
    monthlyWinnerAt:
      typeof stats?.monthly_winner_at === "string"
        ? stats.monthly_winner_at
        : null,
    isWinner: stats?.is_winner === true,
  };
}

export type LeaderboardRankRow = Readonly<{
  rank: number;
  fighterSlug: string;
  displayName: string;
  totalXp: number;
  workoutCount: number;
  currentStatus: string | null;
  isWinner: boolean;
}>;

export async function fetchLeaderboardTopTen(
  client: SupabaseClient,
): Promise<LeaderboardRankRow[]> {
  const { data: statsRows, error: statsErr } = await client
    .from("fighter_stats")
    .select("fighter_id, total_xp, current_status, is_winner")
    .order("total_xp", { ascending: false })
    .limit(10);

  let rows = statsRows;

  if (statsErr && /column .* does not exist/i.test(statsErr.message ?? "")) {
    const legacy = await client
      .from("fighter_stats")
      .select("fighter_id, total_xp")
      .order("total_xp", { ascending: false })
      .limit(10);

    rows = legacy.data ?? null;
  }

  if (!rows?.length) return [];

  const ids = rows.map((r) => r.fighter_id).filter(Boolean) as string[];

  const { data: sessRows } = await client
    .from("training_sessions")
    .select("fighter_id")
    .in("fighter_id", ids);

  const tally = new Map<string, number>();

  for (const row of sessRows ?? []) {
    const id = row.fighter_id as string;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }

  return rows.map((row, i) => {
    const currentStatus =
      typeof (row as { current_status?: unknown }).current_status === "string"
        ? ((row as { current_status?: unknown }).current_status as string)
        : null;
    const isWinner =
      (row as { is_winner?: unknown }).is_winner === true ||
      currentStatus === "Winner of the Month";

    return {
      rank: i + 1,
      fighterSlug: row.fighter_id as string,
      displayName: formatFighterLedgerName(row.fighter_id as string),
      totalXp: num(row.total_xp),
      workoutCount: tally.get(row.fighter_id as string) ?? 0,
      currentStatus,
      isWinner,
    };
  });
}

export type MonthlyXpLeader = Readonly<{
  rank: number;
  fighterSlug: string;
  displayName: string;
  xp30d: number;
  sessions30d: number;
  currentStatus: string | null;
  isWinner: boolean;
}>;

/**
 * Group last-N-days XP by fighter, sort DESC, return top `limit`.
 * This is the canonical "gift candidate" list — the slice used by the
 * admin Gift toggle on the Warrior Passport.
 */
export async function fetchMonthlyXpLeaderboard(
  client: SupabaseClient,
  opts: { days?: number; limit?: number } = {},
): Promise<MonthlyXpLeader[]> {
  const { days = 30, limit = 10 } = opts;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessRows, error: sessErr } = await client
    .from("training_sessions")
    .select("fighter_id, xp_awarded, created_at")
    .gte("created_at", since);

  if (sessErr || !sessRows?.length) return [];

  const tally = new Map<string, { xp: number; sessions: number }>();

  for (const row of sessRows) {
    const id = row.fighter_id as string;
    const entry = tally.get(id) ?? { xp: 0, sessions: 0 };

    entry.xp += num(row.xp_awarded);
    entry.sessions += 1;
    tally.set(id, entry);
  }

  const ids = [...tally.keys()];
  if (!ids.length) return [];

  const { data: statsRows, error: statsErr } = await client
    .from("fighter_stats")
    .select("fighter_id, current_status, is_winner")
    .in("fighter_id", ids);

  let statusById = new Map<
    string,
    { currentStatus: string | null; isWinner: boolean }
  >();

  if (statsErr && /column .* does not exist/i.test(statsErr.message ?? "")) {
    // migration not applied — degrade gracefully without status badges
  } else if (statsRows) {
    statusById = new Map(
      statsRows.map((r) => {
        const currentStatus =
          typeof (r as { current_status?: unknown }).current_status === "string"
            ? ((r as { current_status?: unknown }).current_status as string)
            : null;
        const isWinner =
          (r as { is_winner?: unknown }).is_winner === true ||
          currentStatus === "Winner of the Month";

        return [r.fighter_id as string, { currentStatus, isWinner }];
      }),
    );
  }

  return [...tally.entries()]
    .map(([id, { xp, sessions }]) => ({ id, xp, sessions }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit)
    .map((row, i) => {
      const status = statusById.get(row.id);

      return {
        rank: i + 1,
        fighterSlug: row.id,
        displayName: formatFighterLedgerName(row.id),
        xp30d: row.xp,
        sessions30d: row.sessions,
        currentStatus: status?.currentStatus ?? null,
        isWinner: status?.isWinner ?? false,
      };
    });
}
