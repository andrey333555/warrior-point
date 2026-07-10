"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BOOKING_TYPE_LABEL,
  completeBooking,
  markTipped,
  type BookingType,
} from "@/lib/bookings";
import { resolveSessionTrainer } from "@/lib/session-complete";
import { applyPaymentRewards } from "@/lib/payments/apply-rewards";
import { awardTrainingXp, XP_REWARDS } from "@/lib/xp";
import { ReviewModal } from "@/components/trainer-page";
import { Button } from "@/components/ui/button";

const TIP_PRESETS = [100, 300, 500];

const TRAINERS_BY_QR: Record<string, { name: string }> = {
  "1": { name: "СПЛИТ 🥊" },
  "2": { name: "ИВАН 🥊" },
};

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
  paymentId?: string;
};

export default function CompleteSession({
  bookingId,
  trainerId,
  trainerName = "Тренер",
  trainingType = "split",
  paymentId: paymentIdProp,
}: SessionCompleteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const xpAwarded = useRef(false);
  const paymentHandled = useRef(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [xp, setXp] = useState(XP_REWARDS.training);
  const [cashbackRub, setCashbackRub] = useState<number | null>(null);
  const [settlementNote, setSettlementNote] = useState<string | null>(null);

  const paymentId = searchParams.get("paymentId") ?? paymentIdProp ?? undefined;

  const urlTrainerIdRaw = searchParams.get("trainerId");
  const urlTrainerId = urlTrainerIdRaw
    ? Number.parseInt(urlTrainerIdRaw, 10)
    : undefined;
  const effectiveTrainerId = Number.isFinite(urlTrainerId)
    ? urlTrainerId
    : trainerId;

  const typeKey = (
    trainingType === "individual" ||
    trainingType === "group" ||
    trainingType === "split"
      ? trainingType
      : "split"
  ) as BookingType;

  const { id: resolvedTrainerId, name: resolvedName } = resolveSessionTrainer(
    effectiveTrainerId,
    trainerName,
  );

  const qrTrainer = TRAINERS_BY_QR[String(effectiveTrainerId)];
  const displayName = qrTrainer?.name ?? `🥊 ${resolvedName}`;

  useEffect(() => {
    if (!paymentId || paymentHandled.current) return;
    paymentHandled.current = true;

    void applyPaymentRewards(paymentId).then((result) => {
      if (!result.applied) return;
      if (result.xpAward) setXp(result.xpAward);
      if (result.cashbackRub) setCashbackRub(result.cashbackRub);
      if (result.trainerNetRub != null && result.platformCommissionRub != null) {
        setSettlementNote(
          `Платформа ${result.platformCommissionRub}₽ · тренеру ${result.trainerNetRub}₽`,
        );
      }
    });
  }, [paymentId]);

  useEffect(() => {
    if (paymentId) return;
    if (bookingId) completeBooking(bookingId);
  }, [bookingId, paymentId]);

  useEffect(() => {
    if (paymentId || xpAwarded.current) return;
    xpAwarded.current = true;
    awardTrainingXp(`${BOOKING_TYPE_LABEL[typeKey]} · ${resolvedName}`);
  }, [paymentId, resolvedName, typeKey]);

  const handleDonate = () => {
    if (bookingId) markTipped(bookingId);
    setXp((prev) => prev + 10);
    alert("Спасибо за поддержку 💛");
  };

  return (
    <div className="flex min-h-screen flex-col bg-black p-4 pb-10 text-white">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col gap-5"
      >
        <h1 className="text-2xl font-bold">🔥 Тренировка завершена</h1>

        <motion.p
          key={xp}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="origin-left text-xl text-green-400"
        >
          +{xp} XP ⚡
        </motion.p>

        {cashbackRub ? (
          <p className="text-sm text-amber-300/90">
            +{cashbackRub}₽ кэшбэк на баланс
          </p>
        ) : null}

        {settlementNote ? (
          <p className="text-xs text-gray-500">{settlementNote}</p>
        ) : null}

        {qrTrainer ? null : (
          <p className="text-lg font-bold">{SESSION_TYPE_HEADLINE[typeKey]}</p>
        )}
        <p className="text-2xl font-bold text-white">{displayName}</p>

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
                onClick={handleDonate}
                className="rounded-xl border border-zinc-800 bg-zinc-900 py-4 text-base font-semibold text-white transition-all hover:border-zinc-600 active:scale-95"
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
