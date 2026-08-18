import { loadData, removeData, saveData } from "@/lib/storage";

const PENDING_KEY = "wp.invite.pending.v1";

export type PendingInvite = {
  code: string;
  capturedAt: string;
};

export function captureInviteFromSearch(
  search: string | URLSearchParams,
): PendingInvite | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(
          search.startsWith("?") ? search.slice(1) : search,
        )
      : search;
  const code = params.get("ref")?.trim().toUpperCase();
  if (!code || code.length < 4 || code.length > 32) return null;

  const invite: PendingInvite = {
    code,
    capturedAt: new Date().toISOString(),
  };
  saveData(PENDING_KEY, invite);
  return invite;
}

export function getPendingInvite(): PendingInvite | null {
  const raw = loadData<PendingInvite | null>(PENDING_KEY, null);
  if (!raw?.code) return null;
  return raw;
}

export function clearPendingInvite(): void {
  removeData(PENDING_KEY);
}

/** Bonus copy for invite UI — matches referral share promise. */
export const INVITE_WELCOME_BONUS_RUB = 300;
