import type { SupabaseClient } from "@supabase/supabase-js";
import type { FightRecord, SkillTier } from "@/lib/calibration";

export type ProvisionCalibration = {
  skillTier: SkillTier;
  record: FightRecord;
  startingElo: number;
  verified: boolean;
};

/**
 * Provision a brand-new warrior after Supabase Auth sign-up.
 *
 * Creates:
 *   - `profiles`      row: id, display_name, role = 'fighter'
 *   - `fighter_stats` row: fighter_id, total_xp, record, elo_rating (when present),
 *                          skill_tier, is_verified
 *
 * Safe to call multiple times — uses `onConflict` ignore duplicates.
 */
export async function provisionNewWarrior(
  client: SupabaseClient,
  userId: string,
  displayName: string,
  calibration?: ProvisionCalibration,
): Promise<{ error: Error | null }> {
  const { error: profileErr } = await client.from("profiles").upsert(
    {
      id: userId,
      display_name: displayName.trim() || "Воин",
      role: "fighter",
      balance: 0,
      coach_earnings: 0,
      iphone_tickets: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (profileErr && !/duplicate|already exists/i.test(profileErr.message)) {
    return { error: new Error(profileErr.message) };
  }

  const statsBase: Record<string, unknown> = {
    fighter_id: userId,
    total_xp: 0,
    current_level: 1,
    monthly_xp: 0,
    record_wins: calibration?.record.wins ?? 0,
    record_losses: calibration?.record.losses ?? 0,
    record_draws: calibration?.record.draws ?? 0,
    wins: calibration?.record.wins ?? 0,
    losses: calibration?.record.losses ?? 0,
    draws: calibration?.record.draws ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (calibration) {
    statsBase.elo_rating = calibration.startingElo;
    statsBase.skill_tier = calibration.skillTier;
    statsBase.is_verified = calibration.verified;
    statsBase.current_status = "✅ Подтверждённый боец";
  }

  const { error: statsErr } = await client.from("fighter_stats").upsert(
    statsBase,
    { onConflict: "fighter_id", ignoreDuplicates: true },
  );

  if (statsErr) {
    let payload = { ...statsBase };
    let lastErr = statsErr;

    for (let attempt = 0; attempt < 8; attempt++) {
      const miss = lastErr.message.match(/Could not find the '([^']+)' column/);
      if (!miss || !(miss[1] in payload)) break;
      const { [miss[1]]: _dropped, ...rest } = payload;
      payload = rest;
      const { error: retryErr } = await client
        .from("fighter_stats")
        .upsert(payload, { onConflict: "fighter_id", ignoreDuplicates: true });
      if (!retryErr) return { error: null };
      if (/duplicate|already exists/i.test(retryErr.message)) return { error: null };
      lastErr = retryErr;
    }

    if (!/duplicate|already exists/i.test(lastErr.message)) {
      return { error: new Error(lastErr.message) };
    }
  }

  return { error: null };
}

export function deriveWarriorDisplayId(userId: string): string {
  const clean = userId.replace(/-/g, "").toUpperCase();
  return `WP·${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
}

export function deriveInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const s = (parts[0] ?? "WP").toUpperCase();
  return s.slice(0, 2);
}
