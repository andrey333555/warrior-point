"use client";

import Link from "next/link";
import { Heart, MapPin, Star, Users } from "lucide-react";
import { useFavorites } from "@/lib/useFavorites";

const EASE = "transition-all duration-300 ease-out";

export type GymHeroProps = {
  name: string;
  city: string;
  rating: number;
  members: number;
  image: string;
  gymId?: string;
  onClose?: () => void;
  onTrain?: () => void;
};

export function GymHero({
  name,
  city,
  rating,
  members,
  image,
  gymId,
  onClose,
  onTrain,
}: GymHeroProps) {
  const { items, toggle } = useFavorites("gyms");
  const isSaved = items.includes(name);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={name} className="absolute inset-0 h-full w-full object-cover" />

      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <button
        type="button"
        onClick={() => toggle(name)}
        aria-label={isSaved ? "Убрать из избранного" : "В избранное"}
        aria-pressed={isSaved}
        className="absolute right-4 top-4 z-20 rounded-full bg-black/50 p-2"
      >
        <Heart
          size={18}
          className={isSaved ? "fill-red-500 text-red-500" : "text-white"}
        />
      </button>

      {onClose && gymId ? (
        <div className="absolute left-4 top-4 z-20 flex flex-col items-start gap-1.5">
          <Link
            href={`/gym/${gymId}`}
            className={`rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-purple-300/90 backdrop-blur-md hover:text-purple-200 ${EASE}`}
          >
            open
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className={`rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-neutral-500 hover:text-white ${EASE}`}
          >
            esc
          </button>
        </div>
      ) : null}

      <div className="relative z-10 flex h-full flex-col justify-end p-5">
        <h1 className="text-3xl font-bold tracking-tight text-white">{name}</h1>

        <div className="mt-1 flex items-center gap-1 text-sm text-gray-300">
          <MapPin size={14} aria-hidden />
          {city}
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-gray-200">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400" aria-hidden />
            {rating.toFixed(1)}
          </div>
          <div className="flex items-center gap-1">
            <Users size={14} aria-hidden />
            {members} учеников
          </div>
        </div>

        <button
          type="button"
          onClick={onTrain}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 py-3 font-semibold text-black transition active:scale-95"
        >
          Тренироваться здесь
        </button>
      </div>
    </div>
  );
}

export default GymHero;
