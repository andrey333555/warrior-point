export function normalizeSupabaseUrl(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined;

  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1\/?$/i, "");
}

export type WarriorPublicEnv = Readonly<{ url: string; anonKey: string }>;

export function getWarriorPublicSupabaseEnv(): WarriorPublicEnv | null {
  const rawUrl =
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_API_URL);

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!rawUrl || !anonKey) return null;

  return { url: rawUrl, anonKey };
}
