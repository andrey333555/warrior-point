import { NextResponse } from "next/server";
import {
  fetchFundraiserProgress,
  handleDonate,
  handleGuestSbpDonate,
  type DonateResult,
  type FundraiserProgress,
} from "@/lib/supabase/donations";
import { isGuestDonorId } from "@/lib/guest-donor";
import { createWarriorServerWriteClient } from "@/lib/supabase/server-write";

export const runtime = "nodejs";

type DonateBody = {
  recipientId?: string;
  grossRub?: number;
  comment?: string;
  /** Logged-in viewer id — wallet path. */
  donorId?: string;
  /** Anonymous SBP guest id (`guest:<uuid>`). */
  guestDonorId?: string;
  fundraiserFallback?: FundraiserProgress;
};

const MAX_DONATION_RUB = 1_000_000;

/**
 * Server-authoritative donation endpoint.
 *
 * All balance mutations happen here with the service-role client (or the
 * server anon client until the key is configured), so the browser anon key
 * can be locked out of `profiles.balance` / `donations` writes by
 * migration 0014.
 */
export async function POST(req: Request) {
  let body: DonateBody;
  try {
    body = (await req.json()) as DonateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const recipientId = typeof body.recipientId === "string" ? body.recipientId.trim() : "";
  const grossRub = typeof body.grossRub === "number" ? body.grossRub : NaN;
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 280) : undefined;

  if (!recipientId || recipientId.length > 128) {
    return NextResponse.json(
      { ok: false, message: "recipientId обязателен" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(grossRub) || grossRub < 50 || grossRub > MAX_DONATION_RUB) {
    return NextResponse.json(
      { ok: false, message: "Сумма доната: от 50 ₽ до 1 000 000 ₽" },
      { status: 400 },
    );
  }

  const client = createWarriorServerWriteClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, code: "NO_SUPABASE", message: "Supabase не настроен" },
      { status: 503 },
    );
  }

  const donorId = typeof body.donorId === "string" ? body.donorId.trim() : "";
  const guestDonorId =
    typeof body.guestDonorId === "string" && isGuestDonorId(body.guestDonorId)
      ? body.guestDonorId
      : "";

  let result: DonateResult | null = null;
  let source: "wallet" | "sbp_guest" = "sbp_guest";

  // 1. Wallet path — member donating from their platform balance.
  if (donorId && donorId !== recipientId) {
    const walletResult = await handleDonate(client, {
      donorId,
      recipientId,
      grossRub,
      comment,
    });

    if (walletResult.ok) {
      result = walletResult;
      source = "wallet";
    } else if (walletResult.code === "INVALID_AMOUNT") {
      return NextResponse.json(
        { ok: false, message: walletResult.message },
        { status: 400 },
      );
    }
    // INSUFFICIENT_BALANCE / DB_ERROR → fall through to guest SBP
  }

  // 2. Guest SBP path — anonymous tip, fighter credited net.
  if (!result) {
    if (!guestDonorId) {
      return NextResponse.json(
        { ok: false, message: "Нужен donorId или guestDonorId" },
        { status: 400 },
      );
    }

    const sbpResult = await handleGuestSbpDonate(client, {
      guestDonorId,
      recipientId,
      grossRub,
      comment,
    });

    if (!sbpResult.ok) {
      return NextResponse.json(
        { ok: false, message: sbpResult.message },
        { status: sbpResult.code === "INVALID_AMOUNT" ? 400 : 502 },
      );
    }
    result = sbpResult;
  }

  const fundraiser = await fetchFundraiserProgress(
    client,
    recipientId,
    body.fundraiserFallback
      ? { title: body.fundraiserFallback.title, goalRub: body.fundraiserFallback.goalRub }
      : undefined,
  );

  return NextResponse.json({
    ok: true,
    donationId: result.donationId,
    source,
    grossRub: result.breakdown.gross,
    netRub: result.breakdown.net,
    newDonorBalance: result.newDonorBalance,
    fundraiser,
  });
}
