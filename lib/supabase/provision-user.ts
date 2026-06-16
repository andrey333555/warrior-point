import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Provision a brand-new warrior after Supabase Auth sign-up.
 *
 * Creates:
 *   - `profiles`      row: id, display_name, role = 'fighter'
 *   - `fighter_stats` row: fighter_id, total_xp = 0, current_level = 1,
 *                          record 0-0-0, monthly_xp = 0
 *
 * Safe to call multiple times — uses `onConflict: "id"` / `"fighter_id"` ignore
 * so a double-call (e.g. email-confirm race) won't throw.
 */
export async function provisionNewWarrior(
  client: SupabaseClient,
  userId: string,
  displayName: string,
): Promise<{ error: Error | null }> {
  // 1. profiles row
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

  // 2. fighter_stats row
  const { error: statsErr } = await client.from("fighter_stats").upsert(
    {
      fighter_id: userId,
      total_xp: 0,
      current_level: 1,
      monthly_xp: 0,
      record_wins: 0,
      record_losses: 0,
      record_draws: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fighter_id", ignoreDuplicates: true },
  );

  if (statsErr) {
    // Strip unknown columns one pass and retry — tolerates partial migrations
    const miss = statsErr.message.match(/Could not find the '([^']+)' column/);
    if (miss) {
      const bare = {
        fighter_id: userId,
        total_xp: 0,
        current_level: 1,
        updated_at: new Date().toISOString(),
      };
      const { error: retryErr } = await client
        .from("fighter_stats")
        .upsert(bare, { onConflict: "fighter_id", ignoreDuplicates: true });
      if (retryErr && !/duplicate|already exists/i.test(retryErr.message)) {
        return { error: new Error(retryErr.message) };
      }
    } else if (!/duplicate|already exists/i.test(statsErr.message)) {
      return { error: new Error(statsErr.message) };
    }
  }

  return { error: null };
}

/**
 * Derive a human-readable display ID from a raw Supabase UUID.
 * Example: "b4a7c9d1-3e8f-…" → "WP·B4A7·C9D1"
 */
export function deriveWarriorDisplayId(userId: string): string {
  const clean = userId.replace(/-/g, "").toUpperCase();
  return `WP·${clean.slice(0, 4)}·${clean.slice(4, 8)}`;
}

/**
 * Derive initials from a display name (up to 2 chars).
 * "Иван Петров" → "ИП", "Воин" → "ВО"
 */
export function deriveInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const s = (parts[0] ?? "WP").toUpperCase();
  return s.slice(0, 2);
}
