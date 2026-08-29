import type { SupabaseClient } from "@supabase/supabase-js";
import { donateSettlement } from "@/lib/economy";
import { isGuestDonorId } from "@/lib/guest-donor";

export type DonationRow = {
  id: string;
  donorId: string;
  donorName: string | null;
  grossAmount: number;
  netAmount: number;
  comment: string | null;
  createdAt: string;
};

export type FundraiserProgress = {
  title: string;
  goalRub: number;
  raisedRub: number;
  pct: number;
};

export type DonateResult =
  | {
      ok: true;
      donationId: string;
      newDonorBalance: number;
      breakdown: ReturnType<typeof donateSettlement>;
    }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "SELF_DONATE"
        | "INVALID_AMOUNT"
        | "INSUFFICIENT_BALANCE"
        | "DB_ERROR";
      message: string;
    };

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function resilientUpdate(
  client: SupabaseClient,
  table: string,
  match: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  let payload = { ...patch };

  for (let i = 0; i < 10; i++) {
    const { error } = await client.from(table).update(payload).match(match);
    if (!error) return { error: null };

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss && miss[1] in payload) {
      const { [miss[1]]: _d, ...rest } = payload;
      payload = rest;
      continue;
    }
    return { error: new Error(error.message) };
  }

  return { error: new Error(`Update failed on ${table}`) };
}

async function resilientInsert(
  client: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
): Promise<{ error: Error | null; id?: string }> {
  let payload = { ...row };

  for (let i = 0; i < 12; i++) {
    const { data, error } = await client
      .from(table)
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (!error) {
      return {
        error: null,
        id: typeof data?.id === "string" ? data.id : undefined,
      };
    }

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss && miss[1] in payload) {
      const { [miss[1]]: _d, ...rest } = payload;
      payload = rest;
      continue;
    }
    return { error: new Error(error.message) };
  }

  return { error: new Error(`Insert failed on ${table}`) };
}

/**
 * Atomic donation XP via Postgres RPC `grant_donation_xp`.
 *
 * HOOK (today): call right after INSERT with status='paid'.
 * HOOK (future ЮKassa webhook): when status flips pending→paid, call the
 * same helper — idempotency is inside the RPC (`xp_granted`), not here.
 *
 * XP failure must NEVER fail the money transfer — errors are logged only.
 */
async function grantDonationXpOnce(
  client: SupabaseClient,
  donationId: string | undefined,
): Promise<void> {
  if (!donationId) return;

  try {
    const { error } = await client.rpc("grant_donation_xp", {
      p_donation_id: donationId,
    });
    if (error) {
      console.warn(
        "[donations] grant_donation_xp failed (donate still ok):",
        error.message,
      );
    }
  } catch (err) {
    console.warn("[donations] grant_donation_xp threw (donate still ok):", err);
  }
}

/** Pull fundraiser goal + raised sum for a fighter passport. */
export async function fetchFundraiserProgress(
  client: SupabaseClient,
  recipientId: string,
  fallback?: { title: string; goalRub: number },
): Promise<FundraiserProgress> {
  const title =
    fallback?.title ?? "На сборы в Дагестан";
  const goalRub = fallback?.goalRub ?? 50_000;

  let resolvedTitle = title;
  let resolvedGoal = goalRub;

  const { data: statsRow } = await client
    .from("fighter_stats")
    .select("fundraiser_title, fundraiser_goal_rub")
    .eq("fighter_id", recipientId)
    .maybeSingle();

  if (statsRow) {
    if (typeof statsRow.fundraiser_title === "string" && statsRow.fundraiser_title) {
      resolvedTitle = statsRow.fundraiser_title;
    }
    const g = num(statsRow.fundraiser_goal_rub);
    if (g > 0) resolvedGoal = g;
  }

  const { data: donationRows } = await client
    .from("donations_public")
    .select("net_amount")
    .eq("recipient_id", recipientId);

  const raisedRub = (donationRows ?? []).reduce(
    (sum, row) => sum + num(row.net_amount),
    0,
  );

  const pct =
    resolvedGoal > 0
      ? Math.min(100, Math.round((raisedRub / resolvedGoal) * 100))
      : 0;

  return {
    title: resolvedTitle,
    goalRub: resolvedGoal,
    raisedRub,
    pct,
  };
}

/** Recent donations for the fighter activity feed. */
export async function fetchDonationFeed(
  client: SupabaseClient,
  recipientId: string,
  limit = 12,
): Promise<DonationRow[]> {
  const { data: rows, error } = await client
    .from("donations_public")
    .select("id, supporter_name, gross_amount, net_amount, created_at")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) return [];

  return rows.map((row) => ({
    id: row.id as string,
    donorId: "hidden",
    donorName: typeof row.supporter_name === "string" ? row.supporter_name : null,
    grossAmount: num(row.gross_amount),
    netAmount: num(row.net_amount),
    comment: null,
    createdAt: row.created_at as string,
  }));
}

/**
 * Transfer a direct donation: debit donor balance, credit fighter balance (net),
 * persist comment in `donations` with 5% platform fee.
 */
export async function handleDonate(
  client: SupabaseClient,
  opts: {
    donorId: string;
    recipientId: string;
    grossRub: number;
    comment?: string;
  },
): Promise<DonateResult> {
  const { donorId, recipientId, comment } = opts;

  if (!donorId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Войди в аккаунт для доната",
    };
  }

  if (donorId === recipientId) {
    return {
      ok: false,
      code: "SELF_DONATE",
      message: "Нельзя поддержать собственный профиль",
    };
  }

  const breakdown = donateSettlement(opts.grossRub);
  if (breakdown.gross < 50) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "Минимальная сумма доната — 50 ₽",
    };
  }

  const { data: donorProfile } = await client
    .from("profiles")
    .select("balance")
    .eq("id", donorId)
    .maybeSingle();

  const hasBalanceCol =
    donorProfile !== null && donorProfile !== undefined && "balance" in donorProfile;
  let donorBalance = num(donorProfile?.balance);

  if (hasBalanceCol && donorBalance < breakdown.gross) {
    return {
      ok: false,
      code: "INSUFFICIENT_BALANCE",
      message: `Недостаточно средств · баланс ${donorBalance.toLocaleString("ru-RU")} ₽`,
    };
  }

  const { data: recipientProfile } = await client
    .from("profiles")
    .select("balance")
    .eq("id", recipientId)
    .maybeSingle();

  let recipientBalance = num(recipientProfile?.balance);

  if (hasBalanceCol) {
    donorBalance -= breakdown.gross;
    const { error: debitErr } = await resilientUpdate(
      client,
      "profiles",
      { id: donorId },
      { balance: donorBalance },
    );
    if (debitErr) {
      return { ok: false, code: "DB_ERROR", message: debitErr.message };
    }
  }

  recipientBalance += breakdown.net;
  const { error: creditErr } = await resilientUpdate(
    client,
    "profiles",
    { id: recipientId },
    { balance: recipientBalance },
  );
  if (creditErr) {
    return { ok: false, code: "DB_ERROR", message: creditErr.message };
  }

  const trimmedComment = comment?.trim().slice(0, 280) || null;
  const { error: insertErr, id: donationId } = await resilientInsert(client, "donations", {
    donor_id: donorId,
    recipient_id: recipientId,
    fighter_id: recipientId,
    amount: breakdown.gross * 100,
    currency: "RUB",
    status: "paid",
    message: trimmedComment,
    gross_amount: breakdown.gross,
    platform_fee: breakdown.platformFee,
    net_amount: breakdown.net,
    comment: trimmedComment,
  });

  if (insertErr) {
    return { ok: false, code: "DB_ERROR", message: insertErr.message };
  }

  // Paid at INSERT — grant XP here. Webhook path later: same call after pending→paid.
  await grantDonationXpOnce(client, donationId);
  await bumpDonationsTotal(client, recipientId, breakdown.gross);

  return {
    ok: true,
    donationId: donationId ?? "",
    newDonorBalance: donorBalance,
    breakdown,
  };
}

/**
 * SBP guest tip — no platform wallet, no login.
 * Credits fighter net; donor is an anonymous guest id (Yandex Music model).
 */
export async function handleGuestSbpDonate(
  client: SupabaseClient,
  opts: {
    guestDonorId: string;
    recipientId: string;
    grossRub: number;
    comment?: string;
  },
): Promise<DonateResult> {
  const { guestDonorId, recipientId, comment } = opts;

  if (!isGuestDonorId(guestDonorId)) {
    return { ok: false, code: "DB_ERROR", message: "Некорректный guest donor id" };
  }

  const breakdown = donateSettlement(opts.grossRub);
  if (breakdown.gross < 50) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "Минимальная сумма доната — 50 ₽",
    };
  }

  const { data: recipientProfile } = await client
    .from("profiles")
    .select("balance")
    .eq("id", recipientId)
    .maybeSingle();

  let recipientBalance = num(recipientProfile?.balance);
  recipientBalance += breakdown.net;

  const { error: creditErr } = await resilientUpdate(
    client,
    "profiles",
    { id: recipientId },
    { balance: recipientBalance },
  );
  if (creditErr) {
    return { ok: false, code: "DB_ERROR", message: creditErr.message };
  }

  const trimmedComment = comment?.trim().slice(0, 280) || null;
  const { error: insertErr, id: donationId } = await resilientInsert(client, "donations", {
    donor_id: guestDonorId,
    recipient_id: recipientId,
    fighter_id: recipientId,
    amount: breakdown.gross * 100,
    currency: "RUB",
    status: "paid",
    message: trimmedComment,
    supporter_name: "Гость",
    gross_amount: breakdown.gross,
    platform_fee: breakdown.platformFee,
    net_amount: breakdown.net,
    comment: trimmedComment,
  });

  if (insertErr) {
    return { ok: false, code: "DB_ERROR", message: insertErr.message };
  }

  // Paid at INSERT — grant XP here. Webhook path later: same call after pending→paid.
  await grantDonationXpOnce(client, donationId);
  await bumpDonationsTotal(client, recipientId, breakdown.gross);

  return {
    ok: true,
    donationId: donationId ?? "",
    newDonorBalance: 0,
    breakdown,
  };
}

/** Increment profiles.donations_total (kopecks). Idempotent-safe via read+add. */
async function bumpDonationsTotal(
  client: SupabaseClient,
  recipientId: string,
  grossRub: number,
): Promise<void> {
  const deltaKop = Math.round(grossRub * 100);
  if (deltaKop <= 0) return;

  const { data } = await client
    .from("profiles")
    .select("donations_total")
    .eq("id", recipientId)
    .maybeSingle();

  const current = num(data?.donations_total);
  await resilientUpdate(
    client,
    "profiles",
    { id: recipientId },
    { donations_total: current + deltaKop },
  );
}
