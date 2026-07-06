"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { matchTrainer, type Format, type Goal, type Level, type MatchResult } from "@/lib/ai-match";
import { DEFAULT_TRAINER_IMAGE } from "@/lib/network";
import { createGoalFromAi } from "@/lib/goals";
import { getBookings } from "@/lib/bookings";
import { awardGoalXp } from "@/lib/xp";
import { Button } from "@/components/ui/button";
import { WarriorLogo } from "@/components/warrior-logo";

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    key: "goal",
    question: "Какая цель?",
    options: [
      { value: "mma",         label: "MMA / Бои",      icon: "🥊" },
      { value: "fitness",     label: "Общая форма",    icon: "⚡" },
      { value: "weight-loss", label: "Похудение",      icon: "🔥" },
      { value: "mass",        label: "Набор массы",    icon: "💪" },
    ],
  },
  {
    key: "level",
    question: "Твой уровень?",
    options: [
      { value: "beginner",      label: "Новичок",     icon: "🌱" },
      { value: "intermediate",  label: "Средний",     icon: "⚔️" },
      { value: "advanced",      label: "Продвинутый", icon: "🏆" },
    ],
  },
  {
    key: "format",
    question: "Формат тренировок?",
    options: [
      { value: "split",       label: "Сплит",         icon: "🔀" },
      { value: "individual",  label: "Индивидуально", icon: "👤" },
      { value: "group",       label: "Группа",        icon: "👥" },
    ],
  },
  {
    key: "location",
    question: "Локация",
    options: [
      { value: "global", label: "Везде",      icon: "🌍" },
      { value: "global", label: "Онлайн",     icon: "📱" },
    ],
  },
] as const;

// ── Option button ─────────────────────────────────────────────────────────────

function Option({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all ${
        selected
          ? "border-yellow-400/50 bg-yellow-400/8 shadow-[0_0_24px_-8px_rgba(250,204,21,0.3)]"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className={`font-semibold ${selected ? "text-white" : "text-gray-300"}`}>
        {label}
      </span>
      {selected ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto text-yellow-400"
        >
          ✓
        </motion.span>
      ) : null}
    </motion.button>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
          {i <= step ? (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="h-full rounded-full bg-yellow-400"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ── Thinking animation ────────────────────────────────────────────────────────

function ThinkingScreen() {
  return (
    <motion.div
      key="thinking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-8 text-white"
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-yellow-400/20 border-t-yellow-400"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="absolute inset-2 rounded-full border border-yellow-400/10 border-b-yellow-400/60"
        />
        <span className="text-2xl">⚡</span>
      </div>

      <div className="text-center">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-xs uppercase tracking-[0.3em] text-yellow-400/70">
          AI · Анализ
        </p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-xl font-bold"
        >
          Подбираем тренера…
        </motion.p>

        {["Анализ целей", "Оценка рейтингов", "Подбор формата"].map((t, i) => (
          <motion.p
            key={t}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4] }}
            transition={{ delay: 0.4 + i * 0.5, duration: 0.5 }}
            className="mt-1 text-sm text-gray-500"
          >
            {t}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({
  result,
  index,
  isTop,
}: {
  result: MatchResult;
  index: number;
  isTop: boolean;
}) {
  const router = useRouter();
  const { trainer, gym, reason } = result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.12, type: "spring", stiffness: 300, damping: 28 }}
      className={`overflow-hidden rounded-3xl border ${
        isTop
          ? "border-yellow-400/30 shadow-[0_0_40px_-12px_rgba(250,204,21,0.3)]"
          : "border-zinc-800"
      } bg-zinc-900`}
    >
      {/* Top match badge */}
      {isTop ? (
        <div className="bg-yellow-400/10 px-4 py-2">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.25em] text-yellow-400">
            ⚡ Лучшее совпадение
          </p>
        </div>
      ) : null}

      {/* Trainer info */}
      <div className="flex items-center gap-4 p-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trainer.image || DEFAULT_TRAINER_IMAGE}
            alt={trainer.name}
            className="h-full w-full object-cover object-[center_15%]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{trainer.name}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            ⭐ {trainer.rating.toFixed(1)} · {gym?.name ?? "Global"}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-yellow-400/80">{reason}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 p-3">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => router.push(`/trainer/${trainer.id}`)}
        >
          Профиль
        </Button>
        <Button
          variant={isTop ? "primary" : "secondary"}
          size="sm"
          fullWidth
          onClick={() => router.push(`/booking/${trainer.id}`)}
        >
          Записаться
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Answers = {
  goal?: string;
  level?: string;
  format?: string;
  location?: string;
};

type Phase = "questions" | "thinking" | "results";

export default function AiMatchPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<Phase>("questions");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [dir, setDir] = useState(1);

  const currentStep = STEPS[step]!;
  const currentKey = currentStep.key;
  const currentValue = answers[currentKey as keyof Answers];

  const select = (value: string) => {
    const next = { ...answers, [currentKey]: value };
    setAnswers(next);

    if (step < STEPS.length - 1) {
      setTimeout(() => {
        setDir(1);
        setStep((s) => s + 1);
      }, 220);
    } else {
      // Last step — run matching
      setPhase("thinking");
      setTimeout(() => {
        const goal = (next.goal ?? "fitness") as Goal;
        const level = (next.level ?? "beginner") as Level;
        const format = (next.format ?? "split") as Format;

        const matched = matchTrainer({ goal, level, format });
        setResults(matched);
        setPhase("results");

        try {
          const bookingCount = getBookings().length;
          createGoalFromAi(goal, level, format, bookingCount);
          awardGoalXp(
            `Цель из AI: ${STEPS[0]!.options.find((o) => o.value === goal)?.label ?? goal}`,
          );
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[ai-match] goal save failed:", err);
          }
        }
      }, 2200);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDir(-1);
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatePresence mode="wait">

        {/* ── Thinking ───────────────────────────────────────────────── */}
        {phase === "thinking" ? (
          <ThinkingScreen key="thinking" />

        /* ── Results ───────────────────────────────────────────────── */
        ) : phase === "results" ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-black pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
          >
            <header className="px-4 pb-2 pt-5">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.3em] text-yellow-400/70">
                AI · Warrior Point
              </p>
              <h1 className="mt-1 text-2xl font-bold">Мы подобрали тебе</h1>
              <p className="mt-1 text-sm text-gray-500">
                На основе твоих целей и формата
              </p>
            </header>

            <div className="wp-stack px-4 pt-4">
              {results.map((r, i) => (
                <ResultCard key={r.trainer.id} result={r} index={i} isTop={i === 0} />
              ))}
            </div>

            <div className="px-4 pt-6">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setPhase("questions");
                }}
              >
                Подобрать заново
              </Button>
            </div>
          </motion.div>

        /* ── Questions ─────────────────────────────────────────────── */
        ) : (
          <motion.div
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-screen flex-col bg-black pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
          >
            {/* Header */}
            <header className="flex items-center gap-3 px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={goBack}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
              >
                ←
              </button>
              <WarriorLogo size="sm" />
              <div className="flex-1 min-w-0">
                <ProgressBar step={step} total={STEPS.length} />
              </div>
              <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-gray-600">
                {step + 1}/{STEPS.length}
              </span>
            </header>

            {/* Question */}
            <div className="flex-1 px-4">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -40 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Label */}
                  <p className="mb-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.26em] text-yellow-400/70">
                    Шаг {step + 1}
                  </p>
                  <h2 className="mb-6 text-2xl font-bold">{currentStep.question}</h2>

                  {/* Options */}
                  <div className="space-y-3">
                    {currentStep.options.map((opt) => (
                      <Option
                        key={opt.value + opt.label}
                        icon={opt.icon}
                        label={opt.label}
                        selected={currentValue === opt.value}
                        onClick={() => select(opt.value)}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
