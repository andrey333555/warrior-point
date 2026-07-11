import { findTrainer, type Trainer } from "@/lib/network";
import { loadData, STORAGE_KEYS } from "@/lib/storage";

export function getFavoriteTrainerIds(): string[] {
  return loadData<string[]>(STORAGE_KEYS.trainerFavorites, []);
}

export function isFavoriteTrainer(id: number | string): boolean {
  return getFavoriteTrainerIds().includes(String(id));
}

export function getFavoriteTrainers(): Trainer[] {
  return getFavoriteTrainerIds()
    .map((id) => findTrainer(id))
    .filter((trainer): trainer is Trainer => !!trainer);
}

export function minTrainingPrice(trainer: Trainer): number {
  if (!trainer.trainings.length) return 0;
  return Math.min(...trainer.trainings.map((t) => t.price));
}
