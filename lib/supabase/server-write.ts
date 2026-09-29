import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { getWarriorPublicSupabaseEnv } from "@/lib/supabase/env";
import { isLiveEconomyLocked } from "@/lib/api-session";

let cachedAnon: SupabaseClient | null = null;

/**
 * Best-available Supabase client for **server-side writes** (API routes only).
 *
 * · SUPABASE_SERVICE_ROLE_KEY set → service-role client (bypasses RLS).
 * · Live production without the key → null (fail closed).
 * · Demo only → server-side anon client.
 */
export function createWarriorServerWriteClient(): SupabaseClient | null {
  const service = createWarriorServiceClient();
  if (service) return service;

  if (isLiveEconomyLocked()) return null;

  if (cachedAnon) return cachedAnon;
  const cfg = getWarriorPublicSupabaseEnv();
  if (!cfg) return null;

  cachedAnon = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAnon;
}
