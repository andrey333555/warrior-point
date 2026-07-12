"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BOOKING_TYPE_LABEL,
  completeBooking,
  markTipped,
  type BookingType,
} from "@/lib/bookings";
import { resolveSessionTrainer } from "@/lib/session-complete";
import { applyPaymentRewards } from "@/lib/payments/apply-rewards";
import { awardTrainingXp, getXp, XP_REWARDS } from "@/lib/xp";
import { getOvertakenFighters } from "@/lib/session-overtake";
import {
  getRoundByXP,
  getRoundProgress,
  getXPToNext,
} from "@/lib/levels";
import { findTrainer } from "@/lib/network";
import { submitFighterDonation } from "@/lib/donations-flow";
import { ReviewModal } from "@/components/trainer-page";

const TIP_PRESETS = [100, 300, 500] as const;

const TRAINERS_BY_QR: Record<string, { name: string }> = {
  "1": { name: "СПЛИТ 🥊" },
  "2": { name: "ИВАН 🥊" },
};

type SessionResult = {
  trainerName: string;
  trainerId: string;
  trainerImage: string;
  gymName: string;
  splitType: string;
  duration: number;
  xpGained: number;
  eloChange: number;
  newStreak: number;
  rankChange: number;
  peopleOvertaken: number;
  currentRound: number;
  roundLabel: string;
  roundColor: string;
  roundProgress: number;
  xpToNextRound: number;
  isLevelUp: boolean;
  trainingsToNextRound: number;
  monthSessions: number;
};

function xpToEloDelta(xpBefore: number, xpAfter: number): number {
  return Math.max(1, Math.round((xpAfter - xpBefore) * 0.45));
}

function getMonthSessions(): number {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const ts = start.getTime();
  return Math.max(
    1,
    getXp().history.filter((e) => e.type === "training" && e.ts >= ts).length,
  );
}

function buildResult(opts: {
  trainerId: number;
  trainerName: string;
  gymName: string;
  splitType: string;
  duration: number;
  xpBefore: number;
  xpAfter: number;
  streak: number;
}): SessionResult {
  const roundBefore = getRoundByXP(opts.xpBefore);
  const roundAfter = getRoundByXP(opts.xpAfter);
  const overtake = getOvertakenFighters(opts.xpBefore, opts.xpAfter);
  const xpGain = Math.max(0, opts.xpAfter - opts.xpBefore);
  const trainer = findTrainer(opts.trainerId);

  return {
    trainerName: opts.trainerName,
    trainerId: String(opts.trainerId),
    trainerImage:
      trainer?.image ??
      "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=100&q=80",
    gymName: opts.gymName || "Зал",
    splitType: opts.splitType,
    duration: opts.duration,
    xpGained: xpGain || XP_REWARDS.training,
    eloChange: xpToEloDelta(opts.xpBefore, opts.xpAfter),
    newStreak: opts.streak,
    rankChange: Math.max(1, overtake.count * 4),
    peopleOvertaken: overtake.count,
    currentRound: roundAfter.round,
    roundLabel: roundAfter.label,
    roundColor: roundAfter.color,
    roundProgress: getRoundProgress(opts.xpAfter),
    xpToNextRound: getXPToNext(opts.xpAfter),
    isLevelUp: roundAfter.round > roundBefore.round,
    trainingsToNextRound: Math.max(
      1,
      Math.ceil(getXPToNext(opts.xpAfter) / XP_REWARDS.training),
    ),
    monthSessions: getMonthSessions(),
  };
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mb-1 text-lg">{icon}</div>
      <p className="text-lg font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-white/30">{label}</p>
    </div>
  );
}

export default function CompleteSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const xpAwarded = useRef(false);
  const paymentHandled = useRef(false);

  const [phase, setPhase] = useState(0);
  const [countedXP, setCountedXP] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(
    () => searchParams.get("donate") != null,
  );
  const [donating, setDonating] = useState(false);
  const [donated, setDonated] = useState(false);

  const [xpBefore] = useState(() => getXp().total);
  const [xpAfter, setXpAfter] = useState(() => getXp().total);
  const [streak, setStreak] = useState(() => getXp().streakDays);
  const [cashbackRub, setCashbackRub] = useState<number | null>(null);
  const [sessionGym, setSessionGym] = useState<string | null>(null);

  const paymentId = searchParams.get("paymentId") ?? undefined;
  const bookingId = searchParams.get("bookingId") ?? undefined;

  const urlTrainerIdRaw = searchParams.get("trainerId");
  const urlTrainerId = urlTrainerIdRaw
    ? Number.parseInt(urlTrainerIdRaw, 10)
    : undefined;

  const trainerName =
    searchParams.get("trainer") ?? searchParams.get("trainerName") ?? "Тренер";
  const gymName = searchParams.get("gym") ?? searchParams.get("gymName") ?? "";
  const trainingType = searchParams.get("type") ?? "split";
  const splitName =
    searchParams.get("split") ??
    searchParams.get("training") ??
    (trainingType === "split" ? "Ударка" : null);
  const durationRaw = searchParams.get("duration");
  const duration = durationRaw
    ? Number.parseInt(durationRaw, 10)
    : 60;

  const typeKey = (
    trainingType === "individual" ||
    trainingType === "group" ||
    trainingType === "split"
      ? trainingType
      : "split"
  ) as BookingType;

  const { id: resolvedTrainerId, name: resolvedName } = resolveSessionTrainer(
    Number.isFinite(urlTrainerId) ? urlTrainerId : undefined,
    trainerName,
  );

  const qrTrainer = TRAINERS_BY_QR[String(urlTrainerId)];
  const displayName = qrTrainer?.name ?? resolvedName;
  const displayGym = sessionGym ?? gymName;
  const splitType =
    splitName ?? (qrTrainer ? "СПЛИТ" : BOOKING_TYPE_LABEL[typeKey]);

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), 800);
    const t2 = window.setTimeout(() => setPhase(2), 2000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (!paymentId || paymentHandled.current) return;
    paymentHandled.current = true;

    void applyPaymentRewards(paymentId).then((res) => {
      if (!res.applied) return;
      const xp = getXp();
      setXpAfter(xp.total);
      setStreak(xp.streakDays);
      if (res.cashbackRub) setCashbackRub(res.cashbackRub);
      if (res.gymName) setSessionGym(res.gymName);
    });
  }, [paymentId]);

  useEffect(() => {
    if (paymentId) return;
    if (bookingId) completeBooking(bookingId);
  }, [bookingId, paymentId]);

  useEffect(() => {
    if (paymentId || xpAwarded.current) return;
    xpAwarded.current = true;
    const next = awardTrainingXp(
      `${BOOKING_TYPE_LABEL[typeKey]} · ${resolvedName}`,
    );
    setXpAfter(next.total);
    setStreak(next.streakDays);
  }, [paymentId, resolvedName, typeKey, xpBefore]);

  const result = useMemo(
    () =>
      buildResult({
        trainerId: resolvedTrainerId,
        trainerName: displayName,
        gymName: displayGym,
        splitType,
        duration: Number.isFinite(duration) ? duration : 60,
        xpBefore,
        xpAfter,
        streak,
      }),
    [
      resolvedTrainerId,
      displayName,
      displayGym,
      splitType,
      duration,
      xpBefore,
      xpAfter,
      streak,
    ],
  );

  useEffect(() => {
    if (phase < 1) return;
    const target = result.xpGained;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 30));
    const interval = window.setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        window.clearInterval(interval);
      }
      setCountedXP(current);
    }, 30);
    return () => window.clearInterval(interval);
  }, [phase, result.xpGained]);

  const handleDonate = async (amount: number) => {
    if (donating) return;
    setDonating(true);
    try {
      const res = await submitFighterDonation({
        recipientId: String(resolvedTrainerId),
        grossRub: amount,
        comment: `После тренировки · ${splitType}`,
      });
      if (res.ok) {
        if (bookingId) markTipped(bookingId);
        setDonated(true);
        setDonateOpen(false);
      }
    } finally {
      setDonating(false);
    }
  };

  const handleShare = async () => {
    const text = `🥊 +${result.xpGained} XP · обогнал ${result.peopleOvertaken} бойцов · ${result.trainerName} · Warrior Point`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Warrior Point", text });
        return;
      } catch {
        // user cancelled
      }
    }
    void navigator.clipboard?.writeText(text);
  };

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: "#0A0A0A" }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full"
        style={{
          background: "rgba(201,168,76,0.12)",
          filter: "blur(80px)",
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          className="relative mb-6"
          style={{
            animation: "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{
              background: "rgba(201,168,76,0.15)",
              border: "2px solid rgba(201,168,76,0.5)",
            }}
          >
            <span className="text-5xl">{result.isLevelUp ? "⬆️" : "🥊"}</span>
          </div>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-8 w-1 rounded-full"
              style={{
                background: "rgba(201,168,76,0.4)",
                transform: `rotate(${i * 45}deg) translateY(-60px)`,
                transformOrigin: "center",
                animation: `rayPulse 1.5s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>

        <h1
          className="mb-2 text-3xl font-black text-white"
          style={{ animation: "slideUp 0.5s ease 0.2s both" }}
        >
          {result.isLevelUp
            ? `Раунд ${result.currentRound}!`
            : "Тренировка завершена!"}
        </h1>
        <p
          className="mb-1 text-sm text-white/50"
          style={{ animation: "slideUp 0.5s ease 0.3s both" }}
        >
          {result.splitType} · {result.trainerName} · {result.duration} мин
        </p>
        <p
          className="mb-8 text-xs text-white/30"
          style={{ animation: "slideUp 0.5s ease 0.4s both" }}
        >
          {result.gymName}
        </p>

        {phase >= 1 ? (
          <div
            className="mb-6"
            style={{
              animation: "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div className="flex items-baseline justify-center gap-2">
              <span
                className="text-6xl font-black"
                style={{ color: "#C9A84C" }}
              >
                +{countedXP}
              </span>
              <span className="text-2xl font-bold text-white/40">XP</span>
            </div>
            {cashbackRub ? (
              <p className="mt-1 text-sm text-amber-300/80">
                +{cashbackRub}₽ кэшбэк
              </p>
            ) : null}
          </div>
        ) : null}

        {phase >= 1 ? (
          <div
            className="mb-6 grid w-full grid-cols-3 gap-2"
            style={{ animation: "slideUp 0.5s ease 0.3s both" }}
          >
            <StatCard
              icon="🔥"
              value={`${result.newStreak}`}
              label="дней подряд"
              color="#ef4444"
            />
            <StatCard
              icon="📊"
              value={`+${result.eloChange}`}
              label="ELO"
              color="#3b82f6"
            />
            <StatCard
              icon="⬆️"
              value={`+${result.rankChange}`}
              label="мест"
              color="#22c55e"
            />
          </div>
        ) : null}

        {phase >= 1 && result.peopleOvertaken > 0 ? (
          <div
            className="mb-6 rounded-full px-4 py-2.5"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "0.5px solid rgba(34,197,94,0.2)",
              animation: "slideUp 0.5s ease 0.5s both",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "#22c55e" }}>
              ⚡ Ты обогнал {result.peopleOvertaken}{" "}
              {result.peopleOvertaken === 1 ? "бойца" : "бойцов"} в рейтинге!
            </p>
          </div>
        ) : null}

        {phase >= 1 ? (
          <div
            className="mb-2 w-full rounded-2xl p-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.06)",
              animation: "slideUp 0.5s ease 0.6s both",
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-white/60">
                Раунд {result.currentRound} · {result.roundLabel}
              </span>
              <span className="text-xs text-white/40">
                ещё {result.xpToNextRound.toLocaleString("ru-RU")} XP
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${result.roundProgress}%`,
                  background: `linear-gradient(90deg, ${result.roundColor}99, ${result.roundColor})`,
                  boxShadow: `0 0 8px ${result.roundColor}66`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-white/30">
              🎯 Ещё {result.trainingsToNextRound} тренировок до следующего
              раунда · {result.monthSessions} в этом месяце
            </p>
          </div>
        ) : null}
      </div>

      {phase >= 2 ? (
        <div
          className="space-y-3 px-6 pb-8"
          style={{ animation: "slideUp 0.5s ease both" }}
        >
          <div
            className="rounded-2xl p-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(201,168,76,0.1), transparent)",
              border: "0.5px solid rgba(201,168,76,0.2)",
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full"
                style={{ background: "rgba(201,168,76,0.15)" }}
              >
                <img
                  src={result.trainerImage}
                  className="h-full w-full object-cover"
                  alt={result.trainerName}
                />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">
                  Как тренировка?
                </p>
                <p className="text-xs text-white/40">
                  Поблагодари {result.trainerName}
                </p>
              </div>
            </div>

            {donated ? (
              <p className="py-3 text-center text-sm font-medium text-[#C9A84C]">
                Спасибо за поддержку 💛
              </p>
            ) : donateOpen ? (
              <div className="grid grid-cols-3 gap-2">
                {TIP_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={donating}
                    onClick={() => void handleDonate(amount)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-sm font-semibold text-white transition-all hover:border-[#C9A84C]/40 active:scale-95 disabled:opacity-50"
                  >
                    {amount}₽
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDonateOpen(true)}
                className="w-full rounded-xl py-3 text-sm font-medium"
                style={{ background: "#C9A84C", color: "#0A0A0A" }}
              >
                💸 Поддержать тренера
              </button>
            )}

            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="mt-2 w-full text-center text-xs text-white/40 underline-offset-2 hover:text-white/60 hover:underline"
            >
              ⭐ Оценить тренера
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              border: "0.5px solid rgba(255,255,255,0.1)",
            }}
          >
            📤 Поделиться результатом
          </button>

          <button
            type="button"
            onClick={() => router.push(`/booking/${resolvedTrainerId}`)}
            className="w-full rounded-xl py-3 text-sm font-medium"
            style={{ background: "transparent", color: "rgba(255,255,255,0.5)" }}
          >
            Записаться на следующую →
          </button>

          <button
            type="button"
            onClick={() => router.push("/?tab=passport")}
            className="w-full py-2 text-center text-xs text-white/30 hover:text-white/50"
          >
            В паспорт
          </button>
        </div>
      ) : null}

      {reviewOpen ? (
        <ReviewModal
          trainerId={resolvedTrainerId}
          trainerName={resolvedName}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}

      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes rayPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

/** @deprecated use CompleteSession */
export { CompleteSession as SessionCompletePage };
