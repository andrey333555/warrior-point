import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase/env";

let cached: SupabaseClient | null = null;

/**
 * Server-only Supabase client with the **service role** key.
 *
 * Bypasses RLS — use exclusively in API routes / server code for
 * authoritative writes (payment intents, balance, XP, awards). Never import
 * this from a client component. Returns null if the key is not configured,
 * so callers can fall back to in-memory / demo behaviour.
 */
export function createWarriorServiceClient(): SupabaseClient | null {
  if (cached) return cached;

  const url =
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_API_URL) ??
    normalizeSupabaseUrl(process.env.SUPABASE_URL);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) return null;

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isServiceRoleConfigured(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}
