"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BOOKING_TYPE_LABEL,
  completeBooking,
  markTipped,
  type BookingType,
} from "@/lib/bookings";
import { awardTrainingXp, XP_REWARDS } from "@/lib/xp";
import { findTrainer } from "@/lib/network";
import { ReviewModal } from "@/components/trainer-page";
import { Button } from "@/components/ui/button";

const TIP_PRESETS = [100, 300, 500];

const SESSION_TYPE_HEADLINE: Record<BookingType, string> = {
  split: "СПЛИТ 🥊",
  individual: "ИНДИВИД 🥊",
  group: "ГРУППА 🥊",
};

export type SessionCompleteProps = {
  bookingId?: string;
  trainerId?: number;
  trainerName?: string;
  gymName?: string;
  grossRub?: number;
  trainingType?: string;
};

export default function CompleteSession({
  bookingId,
  trainerId,
  trainerName = "Тренер",
  trainingType = "split",
}: SessionCompleteProps) {
  const router = useRouter();
  const xpAwarded = useRef(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [xpGained] = useState(XP_REWARDS.training);

  const typeKey = (
    trainingType === "individual" ||
    trainingType === "group" ||
    trainingType === "split"
      ? trainingType
      : "split"
  ) as BookingType;

  const trainer = trainerId ? findTrainer(trainerId) : undefined;
  const resolvedTrainerId = trainer?.id ?? trainerId ?? 1;
  const resolvedName = trainer?.name ?? trainerName;

  useEffect(() => {
    if (bookingId) completeBooking(bookingId);
  }, [bookingId]);

  useEffect(() => {
    if (xpAwarded.current) return;
    xpAwarded.current = true;
    awardTrainingXp(`${BOOKING_TYPE_LABEL[typeKey]} · ${resolvedName}`);
  }, [resolvedName, typeKey]);

  return (
    <div className="flex min-h-screen flex-col bg-black p-4 pb-10 text-white">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col gap-5"
      >
        <h1 className="text-2xl font-bold">🔥 Тренировка завершена</h1>

        <p className="animate-bounce text-xl text-green-400">
          +{xpGained} XP ⚡
        </p>

        <p className="text-lg font-bold">{SESSION_TYPE_HEADLINE[typeKey]}</p>
        <p className="text-gray-400">{resolvedName}</p>

        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={() => setReviewOpen(true)}
        >
          ⭐ Оценить
        </Button>

        <div>
          <p className="text-sm text-gray-400">
            Поддержи бойца после тренировки 💪
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {TIP_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  if (bookingId) markTipped(bookingId);
                  // eslint-disable-next-line no-alert
                  alert("Спасибо за поддержку 💛");
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-900 py-4 text-base font-semibold text-white transition-all hover:border-zinc-600"
              >
                {amount}₽
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <Button
            fullWidth
            size="lg"
            onClick={() => router.push(`/booking/${resolvedTrainerId}`)}
          >
            Записаться снова
          </Button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-300"
          >
            В паспорт
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {reviewOpen ? (
          <ReviewModal
            trainerId={resolvedTrainerId}
            trainerName={resolvedName}
            onClose={() => setReviewOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** @deprecated use CompleteSession */
export { CompleteSession as SessionCompletePage };
