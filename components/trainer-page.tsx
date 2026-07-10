"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  DEFAULT_TRAINER_IMAGE,
  getGymLabelForTrainer,
  getGymsForTrainer,
  type Review,
  type Trainer,
  type TrainingType,
  type Gym,
} from "@/lib/network";
import { useReviewsForTrainer, type UserReview } from "@/lib/reviews";
import { SupportModal } from "@/components/support-modal";
import { useSubscription } from "@/lib/subscriptions";
import { Button } from "@/components/ui/button";

type TrainerPageProps = {
  trainer: Trainer;
};

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const cls = size === "xs" ? "text-[10px]" : "text-sm";
  return (
    <span className={cls}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i} className="text-yellow-400">★</span>;
        if (i === full && half) return <span key={i} className="text-yellow-400/50">★</span>;
        return <span key={i} className="text-zinc-700">★</span>;
      })}
    </span>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

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
    if (imgRef.current?.complete) setImageLoaded(true);
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
        animate={imageLoaded ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.06 }}
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

// ── Gyms block ────────────────────────────────────────────────────────────────

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

// ── Review card ───────────────────────────────────────────────────────────────

function ReviewCard({ review, index }: { review: Review | UserReview; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
          {review.userName}
        </p>
        <Stars rating={review.rating} size="xs" />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-300">{review.text}</p>
      <p className="mt-2 text-[10px] text-gray-600">{review.date}</p>
    </motion.div>
  );
}

// ── Reviews block ─────────────────────────────────────────────────────────────

function ReviewsBlock({ trainer }: { trainer: Trainer }) {
  const { userReviews } = useReviewsForTrainer(trainer.id);
  const allReviews = [...userReviews, ...trainer.reviews];

  return (
    <div className="mb-8 px-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300">Отзывы</p>
        <span className="text-xs text-gray-600">{trainer.reviewsCount + userReviews.length} всего</span>
      </div>
      <div className="space-y-3">
        {allReviews.map((r, i) => (
          <ReviewCard key={r.id} review={r} index={i} />
        ))}
      </div>
    </div>
  );
}

// ── Subscription block ────────────────────────────────────────────────────────

function SubscriptionBlock({ trainer }: { trainer: Trainer }) {
  const router = useRouter();
  const { subscribed } = useSubscription(trainer.id);

  if (!trainer.subscriptionEnabled) return null;

  const slots = trainer.subscriptionSlots ?? 20;
  const subs = trainer.currentSubscribers ?? 0;
  const remaining = slots - subs;
  const price = trainer.subscriptionPrice ?? 7990;

  return (
    <div className="mx-4 mb-6 overflow-hidden rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.06] via-transparent to-transparent shadow-[0_0_40px_-16px_rgba(250,204,21,0.25)]">
      {/* Glow edge */}
      <div className="absolute -inset-px rounded-2xl" />

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-yellow-400/80">
              Elite Access
            </p>
            <p className="mt-1 font-semibold text-white">🔥 Тренируйся с тренером</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">
              {price.toLocaleString("ru-RU")}₽
            </p>
            <p className="text-[11px] text-gray-500">в месяц</p>
          </div>
        </div>

        {/* Slots bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-yellow-400/60"
              style={{ width: `${(subs / slots) * 100}%` }}
            />
          </div>
          <p className="shrink-0 text-[11px] text-yellow-400/80">
            Осталось {remaining} мест
          </p>
        </div>

        {/* CTA */}
        <div className="mt-4">
          {subscribed ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 py-3 text-sm font-semibold text-yellow-400">
              ✅ Ты в команде
            </div>
          ) : (
            <Button
              fullWidth
              size="md"
              onClick={() => router.push(`/subscription/${trainer.id}`)}
            >
              Оформить подписку
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrainerPage({ trainer }: TrainerPageProps) {
  const [selected, setSelected] = useState<TrainingType>(trainer.trainings[0]!);
  const [supportOpen, setSupportOpen] = useState(false);
  const [localSupportCount, setLocalSupportCount] = useState(0);
  const router = useRouter();

  const totalSupport = trainer.supportCount + localSupportCount;

  return (
    <>
    <div className="min-h-screen bg-black pb-24 text-white">
      <TrainerHero trainer={trainer} />

      {/* Rating + support row */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <Stars rating={trainer.rating} />
          <span className="text-sm font-semibold text-white">{trainer.rating.toFixed(1)}</span>
          <span className="text-sm text-gray-500">({trainer.reviewsCount} отзывов)</span>
        </div>

        {/* Support block */}
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base">❤️</span>
            <span className="text-sm text-gray-400">
              Поддержали:{" "}
              <motion.span
                key={totalSupport}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-white"
              >
                {totalSupport}
              </motion.span>{" "}
              раз
            </span>
          </div>
          <Button variant="rose" size="sm" onClick={() => setSupportOpen(true)}>
            Поддержать
          </Button>
        </div>
      </div>

      {trainer.bio ? (
        <div className="mb-5 px-4 pt-3">
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

      <SubscriptionBlock trainer={trainer} />

      <ReviewsBlock trainer={trainer} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
        style={{
          background: "linear-gradient(to top, #0A0A0A 80%, transparent)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push(`/booking/${trainer.id}`)}
          className="w-full rounded-xl py-4 font-semibold"
          style={{
            background: "#C9A84C",
            color: "#0A0A0A",
            boxShadow: "0 0 24px rgba(201,168,76,0.3)",
          }}
        >
          ⚡ Записаться · {selected.price.toLocaleString("ru-RU")}₽
        </button>
        <p className="mt-2 text-center text-xs text-white/20">
          🔒 Безопасная оплата
        </p>
      </div>
    </div>

    <AnimatePresence>
      {supportOpen ? (
        <SupportModal
          trainerName={trainer.name}
          onClose={() => setSupportOpen(false)}
          onSuccess={() => setLocalSupportCount((c) => c + 1)}
        />
      ) : null}
    </AnimatePresence>
    </>
  );
}

// ── Re-export for use in review modal ────────────────────────────────────────
export { Stars };
export type { TrainerPageProps };

// ── Review modal (standalone, used from my-trainings) ────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-transform active:scale-95"
        >
          <span className={(hovered || value) >= n ? "text-yellow-400" : "text-zinc-700"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export function ReviewModal({
  trainerId,
  trainerName,
  onClose,
}: {
  trainerId: number;
  trainerName: string;
  onClose: () => void;
}) {
  const { add } = useReviewsForTrainer(trainerId);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    add({ userName: "Вы", text: text.trim(), rating, trainerName });
    setSubmitted(true);
    setTimeout(onClose, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl border-t border-zinc-800 bg-zinc-950 px-5 pb-10 pt-4"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-700" />

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6"
            >
              <span className="text-4xl">✅</span>
              <p className="mt-3 font-semibold text-white">Отзыв опубликован</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-yellow-400/80">
                Оставить отзыв
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">{trainerName}</h2>

              <div className="mt-5">
                <p className="mb-2 text-xs text-gray-500">Оценка</p>
                <StarPicker value={rating} onChange={setRating} />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs text-gray-500">Комментарий</p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Коротко о тренировке…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-400/40"
                />
              </div>

              <Button
                fullWidth
                loading={submitting}
                disabled={!text.trim() || submitting}
                onClick={handleSubmit}
                className="mt-4"
              >
                Опубликовать
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
