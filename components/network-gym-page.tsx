"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  DEFAULT_FIGHTER_IMAGE,
  DEFAULT_GYM_IMAGE,
  DEFAULT_TRAINER_IMAGE,
  getFightersForGym,
  getRecommendedFightersForGym,
  getRecommendedTrainersForGym,
  getTrainersForGym,
  type Fighter,
  type Gym,
  type Trainer,
} from "@/lib/network";

function GymPhoto({ gym }: { gym: Gym }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div className="relative h-[200px] overflow-hidden bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={loaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={gym.image || DEFAULT_GYM_IMAGE}
          alt={gym.name}
          onLoad={() => setLoaded(true)}
          className="h-full w-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
    </div>
  );
}

function RecommendedTrainerCard({
  trainer,
  onClick,
}: {
  trainer: Trainer;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[140px] shrink-0 overflow-hidden rounded-2xl border border-yellow-400/25 bg-zinc-900 text-left shadow-[0_0_24px_-8px_rgba(250,204,21,0.25)]"
    >
      <div className="relative h-[100px] w-full bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trainer.image || DEFAULT_TRAINER_IMAGE}
          alt={trainer.name}
          className="h-full w-full object-cover object-top"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_TRAINER_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
      <p className="truncate px-3 py-2.5 text-sm font-semibold text-white">{trainer.name}</p>
    </button>
  );
}

function RecommendedFighterCard({ fighter }: { fighter: Fighter }) {
  return (
    <div className="w-[140px] shrink-0 rounded-2xl border border-yellow-400/20 bg-zinc-900 px-3 py-3 shadow-[0_0_20px_-10px_rgba(250,204,21,0.2)]">
      <p className="truncate font-semibold text-white">{fighter.name}</p>
      <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-xs text-yellow-400/90">
        {fighter.record}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">ELO {fighter.elo}</p>
    </div>
  );
}

function GymRecommendations({ gym }: { gym: Gym }) {
  const router = useRouter();
  const recTrainers = getRecommendedTrainersForGym(gym.id);
  const recFighters = getRecommendedFightersForGym(gym.id);

  if (recTrainers.length === 0 && recFighters.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.03] py-4">
      <p className="mb-4 px-4 text-sm font-medium text-yellow-400/90">🔥 Рекомендует зал</p>

      {recTrainers.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 px-4 text-xs uppercase tracking-wider text-gray-500">Тренеры</p>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recTrainers.map((t) => (
              <RecommendedTrainerCard
                key={t.id}
                trainer={t}
                onClick={() => router.push(`/trainer/${t.id}`)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {recFighters.length > 0 ? (
        <div>
          <p className="mb-2 px-4 text-xs uppercase tracking-wider text-gray-500">Бойцы</p>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recFighters.map((f) => (
              <RecommendedFighterCard key={f.id} fighter={f} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function NetworkGymPage({ gym }: { gym: Gym }) {
  const router = useRouter();
  const gymTrainers = getTrainersForGym(gym.id);
  const gymFighters = getFightersForGym(gym.id);
  const location = gym.locationHint ?? gym.address;

  return (
    <div className="min-h-screen bg-black pb-28 text-white">
      <header className="absolute left-0 right-0 top-0 z-20 px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400 backdrop-blur-md"
        >
          ← Назад
        </button>
      </header>

      <GymPhoto gym={gym} />

      <div className="px-4 pt-5">
        <h1 className="text-2xl font-bold">{gym.name}</h1>
        <p className="mt-2 text-sm text-gray-400">📍 {location}</p>

        <GymRecommendations gym={gym} />

        <section className="mt-8">
          <p className="mb-3 text-sm font-medium text-gray-300">🔥 Тренеры</p>
          <ul className="space-y-2">
            {gymTrainers.length === 0 ? (
              <li className="text-sm text-gray-600">Пока нет тренеров</li>
            ) : (
              gymTrainers.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/trainer/${t.id}`)}
                    className="flex w-full items-center justify-between rounded-xl bg-zinc-900 px-4 py-3 text-left transition-colors hover:bg-zinc-800"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-sm text-gray-500">→</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mt-8">
          <p className="mb-3 text-sm font-medium text-gray-300">🥊 Бойцы</p>
          <ul className="space-y-2">
            {gymFighters.length === 0 ? (
              <li className="text-sm text-gray-600">Пока нет бойцов</li>
            ) : (
              gymFighters.map((f) => (
                <li key={f.id} className="rounded-xl bg-zinc-900 px-4 py-3">
                  <span className="font-medium">{f.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{f.record}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.06] bg-black/95 p-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            const firstTrainer = gymTrainers[0];
            if (firstTrainer) {
              router.push(`/booking/${firstTrainer.id}`);
            }
          }}
          className="w-full rounded-xl bg-yellow-400 py-3 font-semibold text-black"
        >
          Записаться в зал
        </button>
      </div>
    </div>
  );
}
