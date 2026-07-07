import { loadData, saveData } from "@/lib/storage";

const GUEST_DONOR_KEY = "wp.guest-donor.v1";

/** Stable anonymous donor id for SBP tips (Yandex Music–style, no login). */
export function getOrCreateGuestDonorId(): string {
  if (typeof window === "undefined") return "guest:ssr";

  const existing = loadData<string | null>(GUEST_DONOR_KEY, null);
  if (existing) return existing;

  const id = `guest:${crypto.randomUUID()}`;
  saveData(GUEST_DONOR_KEY, id);
  return id;
}

export function isGuestDonorId(donorId: string): boolean {
  return donorId.startsWith("guest:");
}
