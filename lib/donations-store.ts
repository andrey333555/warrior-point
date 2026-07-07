import { loadData, saveData } from "@/lib/storage";
import type { FundraiserProgress } from "@/lib/supabase/donations";
import { donateSettlement } from "@/lib/economy";

export type LocalDonationRecord = {
  id: string;
  donorId: string;
  recipientId: string;
  grossRub: number;
  netRub: number;
  comment: string | null;
  createdAt: string;
  source: "sbp_guest" | "wallet";
};

const KEY = "wp.donations.v1";

export function loadLocalDonations(): LocalDonationRecord[] {
  return loadData<LocalDonationRecord[]>(KEY, []);
}

export function appendLocalDonation(record: LocalDonationRecord): void {
  const all = loadLocalDonations();
  saveData(KEY, [record, ...all].slice(0, 200));
}

export function localFundraiserProgress(
  recipientId: string,
  fallback: FundraiserProgress,
): FundraiserProgress {
  const raisedExtra = loadLocalDonations()
    .filter((d) => d.recipientId === recipientId)
    .reduce((sum, d) => sum + d.netRub, 0);

  if (raisedExtra <= 0) return fallback;

  const raisedRub = fallback.raisedRub + raisedExtra;
  const pct =
    fallback.goalRub > 0
      ? Math.min(100, Math.round((raisedRub / fallback.goalRub) * 100))
      : 0;

  return { ...fallback, raisedRub, pct };
}

export function recordLocalGuestDonation(opts: {
  donorId: string;
  recipientId: string;
  grossRub: number;
  comment?: string;
}): LocalDonationRecord {
  const breakdown = donateSettlement(opts.grossRub);
  const record: LocalDonationRecord = {
    id: `local-${Date.now()}`,
    donorId: opts.donorId,
    recipientId: opts.recipientId,
    grossRub: breakdown.gross,
    netRub: breakdown.net,
    comment: opts.comment?.trim().slice(0, 280) || null,
    createdAt: new Date().toISOString(),
    source: "sbp_guest",
  };
  appendLocalDonation(record);
  return record;
}
