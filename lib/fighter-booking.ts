import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

/**
 * Map platform fighter profile → booking trainer id (mock network catalogue).
 * Showcase Колесник trains under Drozdov (trainer 1) in the demo graph.
 */
const PROFILE_TO_TRAINER: Record<string, number> = {
  [DEMO_FIGHTER_DB_ID]: 1,
};

export function resolveBookingHref(profileId: string): string {
  const trainerId = PROFILE_TO_TRAINER[profileId];
  if (trainerId) return `/booking/${trainerId}`;
  // Unknown fighter — open booking catalogue, not a wrong trainer.
  return "/booking";
}

export function resolvePublicFighterPath(slug: string | null | undefined): string {
  const s = (slug ?? "").trim().toLowerCase();
  if (s) return `/fighter/${s}`;
  return "/fighter/kolesnik";
}
