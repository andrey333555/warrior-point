"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BOOKING_TYPE_LABEL,
  useBookings,
  type Booking,
} from "@/lib/bookings";
import { ReviewModal } from "@/components/trainer-page";
import { TipModal } from "@/components/tip-modal";
import { findTrainer } from "@/lib/network";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// ── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Booking["type"] }) {
  const accent =
    type === "split"
      ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
      : "border-zinc-700 bg-zinc-800 text-gray-300";

  return (
    <span
      className={`rounded-md border px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.16em] ${accent}`}
    >
      {BOOKING_TYPE_LABEL[type]}
    </span>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  index,
  onReview,
  onTip,
}: {
  booking: Booking;
  index: number;
  onReview?: (booking: Booking) => void;
  onTip?: (booking: Booking) => void;
}) {
  const isCompleted = booking.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{booking.trainerName}</p>
          <p className="mt-0.5 truncate text-xs text-gray-400">🏟 {booking.gymName}</p>
        </div>
        <TypeBadge type={booking.type} />
      </div>

      <div className="mt-3 flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-sm text-gray-300">
        <span>{booking.date}</span>
        <span className="text-gray-600">•</span>
        <span>{booking.time}</span>
      </div>

      {isCompleted ? (
        <div className="mt-3 flex gap-2">
          {onReview ? (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              className="flex-1"
              onClick={() => onReview(booking)}
            >
              ⭐ Отзыв
            </Button>
          ) : null}
          {onTip ? (
            booking.tipped ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/5 py-2.5 text-sm text-yellow-400/60">
                💛 Отправлено
              </div>
            ) : (
              <Button
                variant="accent"
                size="sm"
                fullWidth
                className="flex-1"
                onClick={() => onTip(booking)}
              >
                💛 Чаевые
              </Button>
            )
          ) : null}
        </div>
      ) : (
        <Button variant="secondary" size="sm" fullWidth className="mt-3">
          Открыть
        </Button>
      )}
    </motion.div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MyTrainings() {
  const router = useRouter();
  const bookings = useBookings();
  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const [tipping, setTipping] = useState<Booking | null>(null);

  const upcoming = bookings.filter((b) => b.status === "upcoming");
  const history = bookings.filter((b) => b.status === "completed");

  const resolveTrainerId = (booking: Booking): number => {
    if (booking.trainerId > 0) return booking.trainerId;
    const found = [1, 2, 3, 4, 5, 6, 7]
      .map((id) => findTrainer(id))
      .find((t) => t?.name === booking.trainerName);
    return found?.id ?? 1;
  };

  return (
    <>
      <div className="min-h-screen bg-black pb-24 text-white">
        <header className="flex items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
          >
            ←
          </button>
        </header>

        <div className="px-4">
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            Мои тренировки
          </motion.h1>

          <section className="mt-7">
            <p className="mb-3 text-sm font-medium text-gray-300">🔥 Ближайшие тренировки</p>
          {upcoming.length === 0 ? (
            <EmptyState
              icon="🥊"
              title="У тебя пока нет тренировок"
              description="Запишись к тренеру или пройди AI-подбор"
              actionLabel="Найти тренера"
              actionHref="/ai-match"
            />
          ) : (
              <div className="wp-stack">
                {upcoming.map((b, i) => (
                  <BookingCard key={b.id} booking={b} index={i} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <p className="mb-3 text-sm font-medium text-gray-300">📜 История</p>
            {history.length === 0 ? (
              <p className="text-sm text-gray-600">История пуста</p>
            ) : (
              <div className="space-y-3 opacity-90">
                {history.map((b, i) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    index={i}
                    onReview={setReviewing}
                    onTip={setTipping}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {reviewing ? (
          <ReviewModal
            trainerId={resolveTrainerId(reviewing)}
            trainerName={reviewing.trainerName}
            onClose={() => setReviewing(null)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {tipping ? (
          <TipModal
            bookingId={tipping.id}
            trainerName={tipping.trainerName}
            onClose={() => setTipping(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
