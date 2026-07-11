"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_TRAINER_IMAGE, type Trainer } from "@/lib/network";
import {
  getFavoriteTrainers,
  minTrainingPrice,
} from "@/lib/trainer-favorites";
import { useFavorites } from "@/lib/useFavorites";
import { STORAGE_KEYS } from "@/lib/storage";
import { useBackOrHome } from "@/hooks/use-back-or-home";

function TrainerPickCard({
  trainer,
  onSelect,
}: {
  trainer: Trainer;
  onSelect: (id: number) => void;
}) {
  const price = minTrainingPrice(trainer);
  const styles = trainer.trainings.map((t) => t.name).slice(0, 2).join(" · ");

  return (
    <button
      type="button"
      onClick={() => onSelect(trainer.id)}
      className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 text-left transition hover:border-[#C9A84C]/35 hover:bg-zinc-900 active:scale-[0.98]"
    >
      <div className="relative h-36 overflow-hidden bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trainer.image || DEFAULT_TRAINER_IMAGE}
          alt={trainer.name}
          className="h-full w-full object-cover object-[center_20%] transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-lg font-bold text-white">{trainer.name}</p>
          {styles ? (
            <p className="mt-0.5 truncate text-xs text-zinc-400">{styles}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            Рейтинг
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#C9A84C]">
            ★ {trainer.rating.toFixed(1)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            от
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {price.toLocaleString("ru-RU")} ₽
          </p>
        </div>
      </div>
    </button>
  );
}

export default function FavoriteTrainersPicker() {
  const router = useRouter();
  const goBack = useBackOrHome("/?tab=passport");
  const { items } = useFavorites(STORAGE_KEYS.trainerFavorites, { max: 3 });

  const trainers = useMemo(() => getFavoriteTrainers(), [items]);

  const gridClass =
    trainers.length === 1
      ? "grid grid-cols-1 gap-4"
      : trainers.length === 2
        ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
        : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 pb-24 pt-6 text-white">
      <button
        type="button"
        onClick={goBack}
        className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-[#C9A84C]"
      >
        ← Паспорт
      </button>

      <p className="mt-4 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-[#C9A84C]/80">
        Персональная тренировка
      </p>
      <h1 className="mt-1 text-2xl font-bold">Избранные тренеры</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {trainers.length > 0
          ? `Выбери одного из ${trainers.length} — запись откроется сразу`
          : "Добавь тренеров в избранное на их странице"}
      </p>

      {trainers.length > 0 ? (
        <div className={`mt-6 ${gridClass}`}>
          {trainers.map((trainer) => (
            <TrainerPickCard
              key={trainer.id}
              trainer={trainer}
              onSelect={(id) => router.push(`/booking/${id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center">
          <p className="text-4xl">♡</p>
          <p className="mt-3 text-sm text-zinc-300">
            Пока нет избранных тренеров
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Открой профиль тренера и нажми сердечко — можно сохранить до 3
          </p>
          <button
            type="button"
            onClick={() => router.push("/ai-match")}
            className="mt-5 rounded-xl px-5 py-3 text-sm font-semibold"
            style={{ background: "#C9A84C", color: "#0A0A0A" }}
          >
            Найти тренера
          </button>
        </div>
      )}
    </div>
  );
}
