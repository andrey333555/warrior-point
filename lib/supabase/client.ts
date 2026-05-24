import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getWarriorPublicSupabaseEnv } from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;

/**
 * Browser client — uses NEXT_PUBLIC_* env from `.env.local`.
 * Memoised so we don't spin a new GoTrueClient on every render.
 * Returns null if vars are missing (UI can skip network calls).
 */
export function createWarriorBrowserClient(): SupabaseClient | null {
  if (cached) return cached;

  const cfg = getWarriorPublicSupabaseEnv();

  if (!cfg) return null;

  cached = createClient(cfg.url, cfg.anonKey);
  return cached;
}
