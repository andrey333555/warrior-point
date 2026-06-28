"use client";

import { useRouter } from "next/navigation";
import {
  DEFAULT_FIGHTER_IMAGE,
  DEFAULT_GYM_IMAGE,
  DEFAULT_TRAINER_IMAGE,
  type Fighter,
  type Gym,
  type Trainer,
} from "@/lib/network";

type EntityCardProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  image?: string;
  fallbackImage?: string;
  onClick?: () => void;
  badge?: string;
};

export function EntityCard({
  title,
  subtitle,
  meta,
  image,
  fallbackImage,
  onClick,
  badge,
}: EntityCardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-left ${
        onClick ? "transition-colors hover:border-yellow-400/30 hover:bg-zinc-800/80" : ""
      }`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image || fallbackImage}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = fallbackImage ?? DEFAULT_FIGHTER_IMAGE;
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        {badge ? (
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-yellow-400/80">
            {badge}
          </p>
        ) : null}
        <p className="truncate font-semibold text-white">{title}</p>
        {subtitle ? <p className="truncate text-xs text-gray-400">{subtitle}</p> : null}
        {meta ? <p className="mt-0.5 truncate text-[11px] text-gray-500">{meta}</p> : null}
      </div>
      {onClick ? <span className="shrink-0 text-gray-600">→</span> : null}
    </Tag>
  );
}

export function GymCard({ gym, onClick }: { gym: Gym; onClick?: () => void }) {
  return (
    <EntityCard
      title={gym.name}
      subtitle={gym.city}
      meta={gym.note ?? gym.address}
      image={gym.image}
      fallbackImage={DEFAULT_GYM_IMAGE}
      badge="Зал"
      onClick={onClick}
    />
  );
}

export function TrainerCardCompact({
  trainer,
  onClick,
}: {
  trainer: Trainer;
  onClick?: () => void;
}) {
  const styles = trainer.trainings.map((t) => t.name).slice(0, 2).join(" · ");

  return (
    <EntityCard
      title={trainer.name}
      subtitle={`${trainer.experience} · ${styles}`}
      meta={`${trainer.fighters.length} учеников`}
      image={trainer.image}
      fallbackImage={DEFAULT_TRAINER_IMAGE}
      badge="Тренер"
      onClick={onClick}
    />
  );
}

export function FighterCardCompact({
  fighter,
  onClick,
}: {
  fighter: Fighter;
  onClick?: () => void;
}) {
  return (
    <EntityCard
      title={fighter.name}
      subtitle={`${fighter.record} · ELO ${fighter.elo}`}
      meta={fighter.style.join(" · ")}
      image={fighter.image}
      fallbackImage={DEFAULT_FIGHTER_IMAGE}
      badge="Боец"
      onClick={onClick}
    />
  );
}

export function GymCardLink({ gym }: { gym: Gym }) {
  const router = useRouter();
  return <GymCard gym={gym} onClick={() => router.push(`/gym/${gym.id}`)} />;
}

export function TrainerCardLink({ trainer }: { trainer: Trainer }) {
  const router = useRouter();
  return (
    <TrainerCardCompact trainer={trainer} onClick={() => router.push(`/trainer/${trainer.id}`)} />
  );
}
