import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

/**
 * Map platform fighter profile → booking trainer id (mock network catalogue).
 * Demo fighter trains under Drozdov (trainer 1) in the demo graph.
 */
const PROFILE_TO_TRAINER: Record<string, number> = {
  [DEMO_FIGHTER_DB_ID]: 1,
};

const SLUG_TO_TRAINER: Record<string, number> = {
  king: 1,
};

/** Public fighter card CTA: skip the intermediate booking catalogue. */
export function resolveBookingHref(_slug?: string | null): string {
  return "/booking/1";
}

export function resolveTrainerIdForCoachSlug(
  slug: string | null | undefined,
): number | null {
  const s = (slug ?? "").trim().toLowerCase();
  if (!s) return null;
  if (SLUG_TO_TRAINER[s]) return SLUG_TO_TRAINER[s]!;
  if (PROFILE_TO_TRAINER[s]) return PROFILE_TO_TRAINER[s]!;
  return null;
}

export function resolvePublicFighterPath(slug: string | null | undefined): string {
  const s = (slug ?? "").trim().toLowerCase();
  if (s) return `/fighter/${s}`;
  return "/fighter/king";
}
