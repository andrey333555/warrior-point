"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/useFavorites";
import { STORAGE_KEYS } from "@/lib/storage";

type TrainerFavoriteButtonProps = {
  trainerId: number;
  className?: string;
};

export function TrainerFavoriteButton({
  trainerId,
  className = "",
}: TrainerFavoriteButtonProps) {
  const { items, toggle } = useFavorites(STORAGE_KEYS.trainerFavorites, {
    max: 3,
  });
  const id = String(trainerId);
  const isSaved = items.includes(id);

  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-label={isSaved ? "Убрать из избранного" : "В избранное"}
      aria-pressed={isSaved}
      className={`rounded-full border border-white/10 bg-black/55 p-2.5 backdrop-blur-md transition active:scale-95 ${className}`}
    >
      <Heart
        size={18}
        className={
          isSaved
            ? "fill-[#C9A84C] text-[#C9A84C]"
            : "text-white/90"
        }
      />
    </button>
  );
}
