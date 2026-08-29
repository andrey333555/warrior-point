import { NextResponse } from "next/server";
import {
  fetchFundraiserProgress,
  handleDonate,
  handleGuestSbpDonate,
  type DonateResult,
  type FundraiserProgress,
} from "@/lib/supabase/donations";
import { isGuestDonorId } from "@/lib/guest-donor";
import {
  getApiSessionUserId,
  isDemoEconomyAllowed,
  isLiveEconomyLocked,
} from "@/lib/api-session";
import {
  hashedClientKey,
  jsonError,
  readJsonBody,
  requireWriteClient,
} from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";
import { rpcWalletDonate } from "@/lib/supabase/economy-rpc";

export const runtime = "nodejs";

type DonateBody = {
  recipientId?: string;
  grossRub?: number;
  comment?: string;
  donorId?: string;
  guestDonorId?: string;
  fundraiserFallback?: FundraiserProgress;
};

const MAX_DONATION_RUB = 1_000_000;

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `donate:${hashedClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<DonateBody>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);
  const body = parsed.body;

  const recipientId =
    typeof body.recipientId === "string" ? body.recipientId.trim() : "";
  const grossRub = typeof body.grossRub === "number" ? body.grossRub : NaN;
  const comment =
    typeof body.comment === "string" ? body.comment.slice(0, 280) : undefined;

  if (!recipientId || recipientId.length > 128) {
    return jsonError("recipientId обязателен", 400);
  }

  if (!Number.isFinite(grossRub) || grossRub < 50 || grossRub > MAX_DONATION_RUB) {
    return jsonError("Сумма доната: от 50 ₽ до 1 000 000 ₽", 400);
  }

  const write = requireWriteClient();
  if (!write.ok) return jsonError(write.message, write.status);
  const client = write.client;

  const sessionUserId = await getApiSessionUserId();
  const guestDonorId =
    typeof body.guestDonorId === "string" && isGuestDonorId(body.guestDonorId)
      ? body.guestDonorId
      : "";

  if (
    typeof body.donorId === "string" &&
    body.donorId.trim() &&
    body.donorId.trim() !== sessionUserId
  ) {
    return jsonError("donorId не совпадает с сессией", 403);
  }

  let result: DonateResult | null = null;
  let source: "wallet" | "sbp_guest" = "sbp_guest";

  if (sessionUserId) {
    if (sessionUserId === recipientId) {
      return jsonError("Нельзя поддержать собственный профиль", 400);
    }

    const rpc = await rpcWalletDonate(client, {
      donorId: sessionUserId,
      recipientId,
      grossRub,
      comment,
    });

    if (rpc.ok) {
      result = {
        ok: true,
        donationId: rpc.donationId,
        newDonorBalance: rpc.newDonorBalance,
        breakdown: rpc.breakdown,
      };
      source = "wallet";
    } else if (rpc.code === "INSUFFICIENT_BALANCE") {
      return jsonError("Недостаточно средств на балансе", 402);
    } else if (rpc.code === "INVALID_AMOUNT" || rpc.code === "SELF_DONATE") {
      return jsonError(rpc.message, 400);
    } else {
      const walletResult = await handleDonate(client, {
        donorId: sessionUserId,
        recipientId,
        grossRub,
        comment,
      });
      if (!walletResult.ok) {
        const status =
          walletResult.code === "INSUFFICIENT_BALANCE"
            ? 402
            : walletResult.code === "INVALID_AMOUNT"
              ? 400
              : 502;
        return jsonError(walletResult.message, status);
      }
      result = walletResult;
      source = "wallet";
    }
  }

  if (!result) {
    if (isLiveEconomyLocked() || !isDemoEconomyAllowed()) {
      return jsonError(
        "Гостевой донат без оплаты отключён. Войдите или подключите ЮKassa.",
        401,
      );
    }

    if (!guestDonorId) {
      return jsonError("Нужна авторизация или guestDonorId (demo)", 400);
    }

    const sbpResult = await handleGuestSbpDonate(client, {
      guestDonorId,
      recipientId,
      grossRub,
      comment,
    });

    if (!sbpResult.ok) {
      return jsonError(
        sbpResult.message,
        sbpResult.code === "INVALID_AMOUNT" ? 400 : 502,
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
