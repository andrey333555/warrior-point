import { findTrainer, getTrainerName } from "@/lib/network";

/** Демо-тренер для deep link: /session/complete?trainerId=1 */
export const DEFAULT_SESSION_TRAINER_ID = 1;

export function buildSessionCompleteUrl(
  trainerId: number,
  baseUrl = "http://localhost:3000",
): string {
  const url = new URL("/session/complete", baseUrl);
  url.searchParams.set("trainerId", String(trainerId));
  return url.toString();
}

export function resolveSessionTrainer(
  trainerId?: number,
  trainerNameFallback?: string,
): { id: number; name: string } {
  const id =
    trainerId != null && Number.isFinite(trainerId)
      ? trainerId
      : DEFAULT_SESSION_TRAINER_ID;

  const trainer = findTrainer(id);
  if (trainer) {
    return { id: trainer.id, name: trainer.name };
  }

  return {
    id,
    name:
      trainerNameFallback ??
      getTrainerName(DEFAULT_SESSION_TRAINER_ID),
  };
}
