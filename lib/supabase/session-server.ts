import type { SupabaseClient } from "@supabase/supabase-js";
import {
  advanceFighterXp,
  recordTrainingSessionRub,
  type FighterAdvancerResult,
  type TrainingSessionEconomyResult,
} from "@/lib/economy";

export type ServerSessionResult =
  | {
      ok: true;
      economics: TrainingSessionEconomyResult;
      advancement: FighterAdvancerResult;
      monthlyXpAfter: number;
    }
  | { ok: false; message: string };

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function resilientWrite(
  attempt: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>,
  row: Record<string, unknown>,
  maxAttempts = 12,
): Promise<{ error: Error | null }> {
  let payload = { ...row };

  for (let i = 0; i < maxAttempts; i++) {
    const { error } = await attempt(payload);
    if (!error) return { error: null };

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss && miss[1] in payload) {
      const { [miss[1]]: _dropped, ...rest } = payload;
      payload = rest;
      continue;
    }
    return { error: new Error(error.message) };
  }

  return { error: new Error("Too many missing columns — run migrations") };
}

/**
 * Server-authoritative training session write.
 *
 * XP and level are recomputed **on the server** from the current
 * `fighter_stats` row and the canonical 19% economy — the client only
 * supplies fighterId + gross. Writes `training_sessions` + `fighter_stats`.
 */
export async function recordServerTrainingSession(
  client: SupabaseClient,
  opts: {
    fighterId: string;
    grossRub: number;
    sessionType?: string;
    createdAt?: string;
  },
): Promise<ServerSessionResult> {
  const { fighterId, sessionType } = opts;
  const createdAt = opts.createdAt ?? new Date().toISOString();

  const economics = recordTrainingSessionRub(opts.grossRub);
  const breakdown = economics.breakdown;

  const { data: statsRow } = await client
    .from("fighter_stats")
    .select("total_xp, monthly_xp")
    .eq("fighter_id", fighterId)
    .maybeSingle();

  const totalXpBefore = num(statsRow?.total_xp);
  const monthlyXpBefore = num(statsRow?.monthly_xp);

  const advancement = advanceFighterXp(totalXpBefore, economics.xpAward);
  const monthlyXpAfter = monthlyXpBefore + economics.xpAward;

  const { error: sessErr } = await resilientWrite(
    async (payload) => {
      const { error } = await client.from("training_sessions").insert(payload);
      return { error };
    },
    {
      fighter_id: fighterId,
      gross_amount: breakdown.gross,
      commission_pct: breakdown.commissionPct,
      commission: breakdown.commission,
      fee_amount: breakdown.commission,
      net_amount: breakdown.net,
      xp_awarded: economics.xpAward,
      level_before: advancement.levelBefore,
      level_after: advancement.levelAfter,
      total_xp_after: advancement.totalXpAfter,
      levels_gained: advancement.levelsJumped,
      session_type: sessionType ?? "training",
      currency: "RUB",
      created_at: createdAt,
    },
  );
  if (sessErr) return { ok: false, message: sessErr.message };

  const { error: statsErr } = await resilientWrite(
    async (payload) => {
      const { error } = await client
        .from("fighter_stats")
        .upsert(payload, { onConflict: "fighter_id" });
      return { error };
    },
    {
      fighter_id: fighterId,
      total_xp: advancement.totalXpAfter,
      current_level: advancement.levelAfter,
      monthly_xp: monthlyXpAfter,
      last_session_at: createdAt,
      updated_at: new Date().toISOString(),
    },
    8,
  );
  if (statsErr) return { ok: false, message: statsErr.message };

  return { ok: true, economics, advancement, monthlyXpAfter };
}
