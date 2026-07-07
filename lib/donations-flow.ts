import type { SupabaseClient } from "@supabase/supabase-js";
import {
  handleDonate,
  handleGuestSbpDonate,
  type DonateResult,
  type FundraiserProgress,
  fetchFundraiserProgress,
} from "@/lib/supabase/donations";
import { getOrCreateGuestDonorId } from "@/lib/guest-donor";
import {
  localFundraiserProgress,
  recordLocalGuestDonation,
} from "@/lib/donations-store";

export type FighterDonationResult =
  | {
      ok: true;
      grossRub: number;
      netRub: number;
      donationId: string;
      source: "wallet" | "sbp_guest";
      newDonorBalance: number;
      fundraiser: FundraiserProgress;
    }
  | {
      ok: false;
      message: string;
    };

export type FighterDonationOptions = {
  recipientId: string;
  grossRub: number;
  comment?: string;
  /** Logged-in viewer — wallet used only when balance covers gross and not self. */
  viewerId?: string;
  fundraiserFallback?: FundraiserProgress;
};

/**
 * Unified fighter tip — Yandex Music model:
 * 1. Guest / external user → SBP (no login)
 * 2. Member with balance → wallet when possible
 * 3. Otherwise → SBP guest
 * 4. Supabase down → local ledger (still succeeds for UX)
 */
export async function submitFighterDonation(
  client: SupabaseClient | null,
  opts: FighterDonationOptions,
): Promise<FighterDonationResult> {
  const { recipientId, grossRub, comment, viewerId, fundraiserFallback } = opts;

  const fallback: FundraiserProgress = fundraiserFallback ?? {
    title: "На сборы в Дагестан",
    goalRub: 50_000,
    raisedRub: 300,
    pct: 1,
  };

  const canUseWallet =
    client &&
    viewerId &&
    viewerId !== recipientId &&
    grossRub >= 50;

  if (canUseWallet) {
    const walletResult = await handleDonate(client, {
      donorId: viewerId,
      recipientId,
      grossRub,
      comment,
    });

    if (walletResult.ok) {
      const fundraiser = client
        ? localFundraiserProgress(
            recipientId,
            await fetchFundraiserProgress(client, recipientId, fallback),
          )
        : fallback;

      return {
        ok: true,
        grossRub: walletResult.breakdown.gross,
        netRub: walletResult.breakdown.net,
        donationId: walletResult.donationId,
        source: "wallet",
        newDonorBalance: walletResult.newDonorBalance,
        fundraiser,
      };
    }

    if (
      walletResult.code !== "INSUFFICIENT_BALANCE" &&
      walletResult.code !== "UNAUTHENTICATED" &&
      walletResult.code !== "SELF_DONATE"
    ) {
      // Fall through to SBP for recoverable cases only
      if (walletResult.code === "INVALID_AMOUNT") {
        return { ok: false, message: walletResult.message };
      }
    }
  }

  const guestDonorId = getOrCreateGuestDonorId();

  if (client) {
    const sbpResult = await handleGuestSbpDonate(client, {
      guestDonorId,
      recipientId,
      grossRub,
      comment,
    });

    if (sbpResult.ok) {
      const fundraiser = localFundraiserProgress(
        recipientId,
        await fetchFundraiserProgress(client, recipientId, fallback),
      );

      return {
        ok: true,
        grossRub: sbpResult.breakdown.gross,
        netRub: sbpResult.breakdown.net,
        donationId: sbpResult.donationId,
        source: "sbp_guest",
        newDonorBalance: 0,
        fundraiser,
      };
    }
  }

  const local = recordLocalGuestDonation({
    donorId: guestDonorId,
    recipientId,
    grossRub,
    comment,
  });

  const fundraiser = localFundraiserProgress(recipientId, fallback);

  return {
    ok: true,
    grossRub: local.grossRub,
    netRub: local.netRub,
    donationId: local.id,
    source: "sbp_guest",
    newDonorBalance: 0,
    fundraiser,
  };
}

export function donationErrorMessage(result: DonateResult): string {
  return result.ok ? "" : result.message;
}
