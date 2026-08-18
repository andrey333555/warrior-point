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
import {
  getApiSessionUserId,
  isDemoEconomyAllowed,
  isLiveEconomyLocked,
} from "@/lib/api-session";

export const runtime = "nodejs";

type DonateBody = {
  recipientId?: string;
  grossRub?: number;
  comment?: string;
  /** Ignored for auth — session decides donor. Kept for back-compat. */
  donorId?: string;
  guestDonorId?: string;
  fundraiserFallback?: FundraiserProgress;
};

const MAX_DONATION_RUB = 1_000_000;

/**
 * Server-authoritative donation endpoint.
 * Wallet debit only for the authenticated session user.
 * Unpaid guest "SBP" mint is blocked in production unless ALLOW_DEMO_ECONOMY=1.
 */
export async function POST(req: Request) {
  let body: DonateBody;
  try {
    body = (await req.json()) as DonateBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const recipientId =
    typeof body.recipientId === "string" ? body.recipientId.trim() : "";
  const grossRub = typeof body.grossRub === "number" ? body.grossRub : NaN;
  const comment =
    typeof body.comment === "string" ? body.comment.slice(0, 280) : undefined;

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

  const sessionUserId = await getApiSessionUserId();
  const guestDonorId =
    typeof body.guestDonorId === "string" && isGuestDonorId(body.guestDonorId)
      ? body.guestDonorId
      : "";

  let result: DonateResult | null = null;
  let source: "wallet" | "sbp_guest" = "sbp_guest";

  // 1. Wallet path — ONLY the session user can spend their balance.
  if (sessionUserId && sessionUserId !== recipientId) {
    const walletResult = await handleDonate(client, {
      donorId: sessionUserId,
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
    // INSUFFICIENT_BALANCE → fall through only if demo guest tips allowed
  }

  // Reject spoofed donorId that doesn't match session
  if (
    typeof body.donorId === "string" &&
    body.donorId.trim() &&
    body.donorId.trim() !== sessionUserId
  ) {
    return NextResponse.json(
      { ok: false, message: "donorId не совпадает с сессией" },
      { status: 403 },
    );
  }

  // 2. Guest SBP — blocked in live prod (no payment proof = free mint).
  if (!result) {
    if (isLiveEconomyLocked() || !isDemoEconomyAllowed()) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Гостевой донат без оплаты отключён. Войдите или подключите ЮKassa.",
        },
        { status: 401 },
      );
    }

    if (!guestDonorId) {
      return NextResponse.json(
        { ok: false, message: "Нужна авторизация или guestDonorId (demo)" },
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
      ? {
          title: body.fundraiserFallback.title,
          goalRub: body.fundraiserFallback.goalRub,
        }
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
