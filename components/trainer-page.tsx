"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  DEFAULT_TRAINER_IMAGE,
  getGymLabelForTrainer,
  getGymsForTrainer,
  type Trainer,
  type TrainingType,
  type Gym,
} from "@/lib/network";

type TrainerPageProps = {
  trainer: Trainer;
};

function trainerInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function TrainerHero({ trainer }: { trainer: Trainer }) {
  const [useFallback, setUseFallback] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const styles = trainer.trainings.map((t) => t.name).join(" • ");
  const badge = trainer.badge
    ? `${trainer.badge} • ${trainer.experience} опыта`
    : `${trainer.experience} опыта`;

  useEffect(() => {
    if (imgRef.current?.complete) {
      setImageLoaded(true);
    }
  }, []);

  if (useFallback) {
    return (
      <div className="border-b border-white/[0.06] px-4 pb-5 pt-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-yellow-400/25 bg-zinc-900 text-2xl font-semibold text-yellow-400/90 shadow-[0_0_32px_-8px_rgba(250,204,21,0.35)]"
        >
          {trainerInitials(trainer.name)}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: "easeOut" }}
          className="mt-5 text-center"
        >
          <h1 className="text-2xl font-bold">{trainer.name}</h1>
          {styles ? <p className="mt-1 text-sm text-gray-400">{styles}</p> : null}
          <p className="mt-2 text-sm text-yellow-400">{badge}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-[200px] overflow-hidden bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, scale: 1.06 }}
        animate={
          imageLoaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.06 }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={trainer.image || DEFAULT_TRAINER_IMAGE}
          alt={trainer.name}
          onLoad={() => setImageLoaded(true)}
          onError={() => setUseFallback(true)}
          className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={imageLoaded ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
        className="absolute inset-x-0 bottom-0 p-4"
      >
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-yellow-400/80">
          Тренер
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{trainer.name}</h1>
        {styles ? <p className="mt-1 text-sm text-gray-300">{styles}</p> : null}
        <p className="mt-1.5 text-sm text-yellow-400">{badge}</p>
      </motion.div>
    </div>
  );
}

function TrainerGymsBlock({ trainer }: { trainer: Trainer }) {
  const router = useRouter();
  const gymList = getGymsForTrainer(trainer.id);
  const multiple = gymList.length > 1;

  const renderCard = (gym: Gym) => (
    <button
      key={gym.id}
      type="button"
      onClick={() => router.push(`/gym/${gym.id}`)}
      className={`flex shrink-0 items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-left transition-colors hover:border-yellow-400/25 hover:bg-zinc-800 ${
        multiple ? "w-[72vw] max-w-[280px]" : "w-full"
      }`}
    >
      <div className="min-w-0 pr-3">
        <p className="truncate font-semibold text-white">{gym.name}</p>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {getGymLabelForTrainer(trainer, gym.id)}
        </p>
      </div>
      <span className="shrink-0 text-gray-500">→</span>
    </button>
  );

  return (
    <div className="mb-6">
      <p className="mb-2 px-4 text-sm text-gray-400">Где тренирует</p>
      {multiple ? (
        <div className="-mx-0 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {gymList.map(renderCard)}
        </div>
      ) : (
        <div className="px-4">{gymList.map(renderCard)}</div>
      )}
    </div>
  );
}

export default function TrainerPage({ trainer }: TrainerPageProps) {
  const [selected, setSelected] = useState<TrainingType>(trainer.trainings[0]!);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <TrainerHero trainer={trainer} />

      {trainer.bio ? (
        <div className="mb-5 px-4 pt-5">
          <p className="text-sm text-gray-300">{trainer.bio}</p>
        </div>
      ) : null}

      <div className="mb-6 px-4">
        <p className="mb-2 text-sm text-gray-400">Направление</p>
        <div className="flex flex-wrap gap-2">
          {trainer.trainings.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className={`rounded-xl px-4 py-2 ${
                selected.id === s.id ? "bg-yellow-400 text-black" : "bg-zinc-800"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <TrainerGymsBlock trainer={trainer} />

      <div className="mb-6 px-4">
        <p className="mb-2 text-sm text-gray-400">Сегодня</p>
        <div className="flex gap-2">
          {["10:00", "12:00", "18:00"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => router.push(`/booking/${trainer.id}`)}
              className="rounded-xl bg-zinc-800 px-4 py-2"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.06] bg-black/95 p-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.push(`/booking/${trainer.id}`)}
          className="w-full rounded-xl bg-yellow-400 py-3.5 font-semibold text-black"
        >
          Записаться
        </button>
      </div>
    </div>
  );
}
