import type { ProfileVisibility } from "@/lib/fighter-public";
import { saveData, loadData, STORAGE_KEYS } from "@/lib/storage";

export type LocalPrivacy = {
  bookingEnabled: boolean;
  visibility: ProfileVisibility;
  hideWeightClass: boolean;
  hideClub: boolean;
  hideBio: boolean;
  hideRecord: boolean;
  slug: string | null;
};

const DEFAULTS: LocalPrivacy = {
  bookingEnabled: true,
  visibility: "public",
  hideWeightClass: false,
  hideClub: false,
  hideBio: false,
  hideRecord: false,
  slug: "king",
};

export function loadLocalPrivacy(): LocalPrivacy {
  return loadData<LocalPrivacy>(STORAGE_KEYS.privacy, DEFAULTS) ?? DEFAULTS;
}

export function saveLocalPrivacy(next: LocalPrivacy): void {
  saveData(STORAGE_KEYS.privacy, next);
}
