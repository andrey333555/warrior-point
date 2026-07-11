import type { SupabaseClient } from "@supabase/supabase-js";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Credit a fighter's platform wallet (`profiles.balance`).
 * Only callable from API routes with the service-role client.
 */
export async function creditProfileBalance(
  client: SupabaseClient,
  profileId: string,
  amountRub: number,
): Promise<{ ok: true; newBalance: number } | { ok: false; message: string }> {
  const credit = Math.max(0, Math.round(amountRub));
  if (!profileId) {
    return { ok: false, message: "profileId обязателен" };
  }
  if (credit === 0) {
    const { data } = await client
      .from("profiles")
      .select("balance")
      .eq("id", profileId)
      .maybeSingle();
    return { ok: true, newBalance: num(data?.balance) };
  }

  const { data: row, error: readErr } = await client
    .from("profiles")
    .select("balance")
    .eq("id", profileId)
    .maybeSingle();

  if (readErr) {
    return { ok: false, message: readErr.message };
  }

  const hasBalanceCol = row !== null && row !== undefined && "balance" in row;
  if (!hasBalanceCol) {
    return { ok: true, newBalance: 0 };
  }

  const newBalance = num(row?.balance) + credit;
  const { error: writeErr } = await client
    .from("profiles")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (writeErr) {
    return { ok: false, message: writeErr.message };
  }

  return { ok: true, newBalance };
}
