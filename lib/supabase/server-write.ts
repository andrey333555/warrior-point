import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { getWarriorPublicSupabaseEnv } from "@/lib/supabase/env";

let cachedAnon: SupabaseClient | null = null;

/**
 * Best-available Supabase client for **server-side writes** (API routes only).
 *
 * · SUPABASE_SERVICE_ROLE_KEY set → service-role client (bypasses RLS,
 *   authoritative; pair with migration 0014 which locks economy writes
 *   from anon).
 * · Otherwise → server-side anon client, so the demo keeps working before
 *   the key is configured. Never import from client components.
 */
export function createWarriorServerWriteClient(): SupabaseClient | null {
  const service = createWarriorServiceClient();
  if (service) return service;

  if (cachedAnon) return cachedAnon;
  const cfg = getWarriorPublicSupabaseEnv();
  if (!cfg) return null;

  cachedAnon = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAnon;
}
