import type { DonateResult, FundraiserProgress } from "@/lib/supabase/donations";
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

type DonateApiResponse = {
  ok: boolean;
  message?: string;
  donationId?: string;
  source?: "wallet" | "sbp_guest";
  grossRub?: number;
  netRub?: number;
  newDonorBalance?: number;
  fundraiser?: FundraiserProgress;
};

/**
 * Unified fighter tip — Yandex Music model.
 *
 * Balance mutations run **server-side** (`/api/donations/create`,
 * service-role) so the browser anon key never touches `profiles.balance`.
 * Fallback: server unreachable / Supabase down → local ledger (UX still
 * succeeds in demo).
 */
export async function submitFighterDonation(
  opts: FighterDonationOptions,
): Promise<FighterDonationResult> {
  const { recipientId, grossRub, comment, viewerId, fundraiserFallback } = opts;

  const fallback: FundraiserProgress = fundraiserFallback ?? {
    title: "На сборы в Дагестан",
    goalRub: 50_000,
    raisedRub: 300,
    pct: 1,
  };

  const guestDonorId = getOrCreateGuestDonorId();

  try {
    const res = await fetch("/api/donations/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId,
        grossRub,
        comment,
        donorId: viewerId && viewerId !== recipientId ? viewerId : undefined,
        guestDonorId,
        fundraiserFallback: fallback,
      }),
    });

    const data = (await res.json()) as DonateApiResponse;

    if (res.status === 400) {
      return { ok: false, message: data.message ?? "Некорректный донат" };
    }

    if (res.ok && data.ok) {
      return {
        ok: true,
        grossRub: data.grossRub ?? grossRub,
        netRub: data.netRub ?? grossRub,
        donationId: data.donationId ?? "",
        source: data.source ?? "sbp_guest",
        newDonorBalance: data.newDonorBalance ?? 0,
        fundraiser: localFundraiserProgress(recipientId, data.fundraiser ?? fallback),
      };
    }
  } catch {
    // network / server down — fall through to the local ledger
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
