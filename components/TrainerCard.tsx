"use client";

import { useRouter } from "next/navigation";
import type { Trainer, TrainingType } from "@/lib/data";

type TrainerCardProps = {
  trainer: Trainer;
  selectedSplitId?: string;
  onSelectSplit?: (split: TrainingType) => void;
};

export default function TrainerCard({
  trainer,
  selectedSplitId,
  onSelectSplit,
}: TrainerCardProps) {
  const router = useRouter();

  return (
    <div className="rounded-2xl bg-zinc-900 p-4">
      <h3 className="text-lg font-semibold text-white">{trainer.name}</h3>
      <p className="mt-1 text-sm text-gray-400">{trainer.experience} опыта</p>

      {onSelectSplit ? (
        <div className="mt-3 space-y-2">
          {trainer.trainings.map((t) => {
            const selected = selectedSplitId === t.id;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectSplit(t)}
                className={`flex w-full items-center justify-between rounded-xl bg-black/40 p-3 text-left ${
                  selected ? "ring-1 ring-yellow-400/60" : ""
                }`}
              >
                <div>
                  <p className="text-sm text-white">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.duration}</p>
                </div>
                <span className="text-sm font-semibold text-yellow-400">{t.price}₽</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {trainer.trainings.map((t) => (
            <div key={t.id}>
              <p className="text-sm text-white">{t.name}</p>
              <p className="text-xs text-gray-400">{t.duration}</p>
              <button
                type="button"
                onClick={() => router.push("/booking")}
                className="text-sm font-semibold text-yellow-400"
              >
                {t.price}₽
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
