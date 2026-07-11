"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { signOutWarrior } from "@/hooks/use-warrior-auth";
import { useBookings, type Booking } from "@/lib/bookings";
import { trainers, DEFAULT_TRAINER_IMAGE } from "@/lib/network";
import { useXp, levelFromXp, xpForNextLevel, xpProgress } from "@/lib/xp";
import { useGoals, goalPercent, ensureDefaultGoals, type UserGoal } from "@/lib/goals";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import WalletWidget from "@/components/wallet-widget";
import StreakWidget from "@/components/streak-widget";
import { createStreakData } from "@/lib/loyalty";
import { useWallet } from "@/lib/wallet-store";

// ── Static user config ────────────────────────────────────────────────────────

const USER_HANDLE = "WARRIOR.X9";

// ── Achievements config ───────────────────────────────────────────────────────

type Achievement = {
  id: string;
  icon: string;
  label: string;
  unlocked: boolean;
};

function deriveAchievements(bookings: Booking[], streakDays: number): Achievement[] {
  const total = bookings.length;
  const hasSplit = bookings.some((b) => b.type === "split");
  const hasCompleted = bookings.some((b) => b.status === "completed");

  return [
    { id: "first", icon: "🥊", label: "Первая запись", unlocked: total >= 1 },
    { id: "split-init", icon: "🔀", label: "Первый сплит", unlocked: hasSplit },
    { id: "streak7", icon: "🔥", label: "7 дней подряд", unlocked: streakDays >= 7 },
    { id: "streak3", icon: "⚡", label: "3 тренировки", unlocked: hasCompleted },
    { id: "ten", icon: "🏆", label: "10 тренировок", unlocked: total >= 10 },
    { id: "win", icon: "🥇", label: "Первая победа", unlocked: false },
  ];
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-500">
      {children}
    </p>
  );
}

// ── XP Bar ────────────────────────────────────────────────────────────────────

function XpBar({ xp, xpNext }: { xp: number; xpNext: number }) {
  const pct = Math.min((xp / xpNext) * 100, 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-gray-500">
        <span>{xp} XP</span>
        <span>{xpNext} XP</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"
        />
      </div>
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  icon,
  value,
  label,
  delay,
}: {
  icon: string;
  value: string | number;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 py-4"
    >
      <span className="text-xl">{icon}</span>
      <p className="mt-1.5 font-[family-name:var(--font-jetbrains-mono)] text-xl font-bold text-white">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
    </motion.div>
  );
}

// ── Booking row ───────────────────────────────────────────────────────────────

function BookingRow({ booking, index }: { booking: Booking; index: number }) {
  const isUpcoming = booking.status === "upcoming";
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
    >
      <div
        className={`h-2 w-2 shrink-0 rounded-full ${
          isUpcoming ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-zinc-600"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{booking.trainerName}</p>
        <p className="truncate text-[11px] text-gray-500">
          {booking.gymName} · {booking.date} {booking.time}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
          isUpcoming
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-zinc-700 bg-zinc-800 text-gray-500"
        }`}
      >
        {isUpcoming ? "Скоро" : "✓"}
      </span>
    </motion.div>
  );
}

// ── Trainer pill ──────────────────────────────────────────────────────────────

function TrainerPill({
  name,
  trainerId,
}: {
  name: string;
  trainerId: number | undefined;
}) {
  const router = useRouter();
  const trainer = trainers.find((t) => t.id === trainerId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trainer?.image || DEFAULT_TRAINER_IMAGE}
          alt={name}
          className="h-full w-full object-cover object-[center_15%]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="text-[10px] text-gray-500">
          ⭐ {trainer?.rating.toFixed(1) ?? "—"} · {trainer?.experience ?? "—"} опыта
        </p>
      </div>
      <div className="flex gap-1.5">
        {trainerId !== undefined ? (
          <>
            <button
              type="button"
              onClick={() => router.push(`/chat/${trainerId}`)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[10px] text-gray-300 transition-colors hover:text-white"
            >
              Чат
            </button>
            <button
              type="button"
              onClick={() => router.push(`/trainer/${trainerId}`)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[10px] text-gray-300 transition-colors hover:text-white"
            >
              →
            </button>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}

// ── Goal card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  currentCount,
  index,
}: {
  goal: UserGoal;
  currentCount: number;
  index: number;
}) {
  const pct = goalPercent(goal, currentCount);
  const current = Math.min(Math.max(0, currentCount - goal.baseCount), goal.target);
  const done = pct >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index }}
      className={`rounded-2xl border p-4 ${
        done
          ? "border-yellow-400/30 bg-yellow-400/[0.05] shadow-[0_0_20px_-8px_rgba(250,204,21,0.25)]"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{goal.icon}</span>
          <div>
            <p className="font-semibold text-white leading-tight">{goal.label}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">{goal.description}</p>
          </div>
        </div>
        <span
          className={`shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold ${
            done ? "text-yellow-400" : "text-gray-400"
          }`}
        >
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.1 + 0.06 * index, duration: 0.6, ease: "easeOut" }}
            className={`h-full rounded-full ${done ? "bg-yellow-400" : "bg-yellow-400/60"}`}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-600">
          <span>
            {current} / {goal.target} {goal.unit}
          </span>
          {done ? (
            <span className="text-yellow-400">✓ Выполнено</span>
          ) : (
            <span>Осталось: {goal.target - current}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Achievement badge ─────────────────────────────────────────────────────────

function AchievementBadge({ a, index }: { a: Achievement; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.04 * index }}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 ${
        a.unlocked
          ? "border-yellow-400/25 bg-yellow-400/[0.06] shadow-[0_0_16px_-6px_rgba(250,204,21,0.2)]"
          : "border-zinc-800 bg-zinc-900 opacity-35"
      }`}
    >
      <span className="text-2xl">{a.icon}</span>
      <p className={`text-center text-[10px] leading-tight ${a.unlocked ? "text-gray-300" : "text-gray-600"}`}>
        {a.label}
      </p>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const bookings = useBookings();
  const xpState = useXp();

  const handleSignOut = async () => {
    await signOutWarrior();
    router.push("/");
  };

  const level = levelFromXp(xpState.total);
  const xpCurrent = xpProgress(xpState.total);
  const xpNext = xpForNextLevel(xpState.total);

  const goals = useGoals();
  const wallet = useWallet();

  const streakData = useMemo(
    () => createStreakData(xpState.streakDays, xpState.lastWorkoutDate),
    [xpState.streakDays, xpState.lastWorkoutDate],
  );

  const upcoming = bookings.filter((b) => b.status === "upcoming");
  const completed = bookings.filter((b) => b.status === "completed");

  // Ensure at least the monthly goal exists on first load
  useMemo(() => ensureDefaultGoals(bookings.length), [bookings.length]);
  const achievements = useMemo(
    () => deriveAchievements(bookings, xpState.streakDays),
    [bookings, xpState.streakDays],
  );

  // Unique trainers from history
  const myTrainers = useMemo(() => {
    const seen = new Set<number>();
    return bookings
      .filter((b) => b.status === "completed" && b.trainerId > 0)
      .filter((b) => {
        if (seen.has(b.trainerId)) return false;
        seen.add(b.trainerId);
        return true;
      })
      .map((b) => ({
        name: b.trainerName,
        trainerId: b.trainerId,
      }));
  }, [bookings]);

  const totalHours = bookings.length; // 1 hr per session

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-black pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-white">

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden px-4 pb-6 pt-6"
      >
        {/* Glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-yellow-400/[0.06] to-transparent" />

        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/20 to-yellow-400/5 shadow-[0_0_24px_-8px_rgba(250,204,21,0.4)]">
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-bold text-yellow-400">
              WX
            </span>
            {/* Level badge */}
            <div className="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-black bg-yellow-400 text-[10px] font-bold text-black">
              {level}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-yellow-400/70">
              Warrior Point
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight">{USER_HANDLE}</h1>
            <p className="text-sm text-gray-500">
              Level {level} · {xpState.streakDays > 0 ? `${xpState.streakDays} day streak 🔥` : "Нет серии"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
          >
            ←
          </button>
        </div>

        {/* XP bar */}
        <div className="mt-5">
          <XpBar xp={xpCurrent} xpNext={100} />
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-600">
            <span>{xpState.total} XP всего</span>
            <span>До Level {level + 1}: {xpNext - xpState.total} XP</span>
          </div>
        </div>
      </motion.div>

      <div className="wp-sections px-4 pb-8">

        <section className="mb-6">
          <SectionTitle>Серия</SectionTitle>
          <StreakWidget
            streak={streakData}
            onBookSplit={() => router.push("/booking")}
          />
        </section>

        <section className="mb-6">
          <SectionTitle>Кошелёк</SectionTitle>
          <WalletWidget
            wallet={wallet}
            isVIP={false}
            streak={xpState.streakDays}
          />
          <button
            type="button"
            onClick={() => router.push("/referral")}
            className="mt-3 w-full rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3.5 text-sm font-semibold text-yellow-400 transition hover:border-yellow-400/50 hover:bg-yellow-400/15 active:scale-[0.99]"
          >
            🎁 Пригласи друга — получи 300₽
          </button>
        </section>

        {/* ── PROGRESS ── */}
        <section>
          <SectionTitle>Прогресс</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon="🥊" value={bookings.length} label="Тренировок" delay={0.1} />
            <StatTile icon="⏱" value={`${totalHours}ч`} label="Часов" delay={0.15} />
            <StatTile icon="🔥" value={xpState.streakDays || "—"} label="Streak" delay={0.2} />
            <StatTile icon="⚡" value={xpState.total} label="XP всего" delay={0.25} />
          </div>
        </section>

        {/* ── GOALS ── */}
        {goals.length > 0 ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle>Цели</SectionTitle>
              <button
                type="button"
                onClick={() => router.push("/ai-match")}
                className="text-xs text-yellow-400/70 hover:text-yellow-400"
              >
                + Новая цель
              </button>
            </div>
            <div className="space-y-3">
              {goals.map((g, i) => (
                <GoalCard key={g.id} goal={g} currentCount={bookings.length} index={i} />
              ))}
            </div>
          </section>
        ) : (
          <section>
            <SectionTitle>Цели</SectionTitle>
            <EmptyState
              icon="⚡"
              title="Поставь первую цель"
              description="AI подберёт план под тебя"
              actionLabel="Установить цель"
              actionHref="/ai-match"
            />
          </section>
        )}

        {/* ── TRAININGS ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Тренировки</SectionTitle>
            <button
              type="button"
              onClick={() => router.push("/trainer/1")}
              className="text-xs text-yellow-400/80 hover:text-yellow-400"
            >
              + Записаться
            </button>
          </div>

          {upcoming.length > 0 ? (
            <div className="mb-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-600">Ближайшие</p>
              {upcoming.map((b, i) => (
                <BookingRow key={b.id} booking={b} index={i} />
              ))}
            </div>
          ) : null}

          {completed.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-600">История</p>
              {completed.slice(0, 3).map((b, i) => (
                <BookingRow key={b.id} booking={b} index={i} />
              ))}
              {completed.length > 3 ? (
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => router.push("/profile/trainings")}
                >
                  Показать все ({completed.length})
                </Button>
              ) : null}
            </div>
          ) : null}

          {bookings.length === 0 ? (
            <EmptyState
              icon="🥊"
              title="У тебя пока нет тренировок"
              description="Запишись к тренеру или пройди AI-подбор"
              actionLabel="Найти тренера"
              actionHref="/ai-match"
            />
          ) : null}
        </section>

        {/* ── TRAINERS ── */}
        {myTrainers.length > 0 ? (
          <section>
            <SectionTitle>Мои тренеры</SectionTitle>
            <div className="space-y-2">
              {myTrainers.map(({ name, trainerId }) => (
                <TrainerPill key={name} name={name} trainerId={trainerId} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── ACHIEVEMENTS ── */}
        <section>
          <SectionTitle>Достижения</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a, i) => (
              <AchievementBadge key={a.id} a={a} index={i} />
            ))}
          </div>
        </section>

        {/* ── XP HISTORY ── */}
        {xpState.history.length > 0 ? (
          <section>
            <SectionTitle>История XP</SectionTitle>
            <div className="space-y-2">
              {[...xpState.history].reverse().slice(0, 5).map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">
                      {event.type === "training" ? "🥊" : event.type === "streak" ? "🔥" : "🎯"}
                    </span>
                    <p className="text-sm text-gray-300">{event.label}</p>
                  </div>
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-yellow-400">
                    +{event.amount}
                  </span>
                </motion.div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── QUICK ACTIONS ── */}
        <section>
          <SectionTitle>Быстрые действия</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push("/ai-match")}
              className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-yellow-400/25"
            >
              <span className="text-xl">⚡</span>
              <p className="text-sm font-semibold text-white">AI подбор</p>
              <p className="text-[10px] text-gray-600">Найти тренера</p>
            </button>
            <button
              type="button"
              onClick={() => router.push("/?tab=leaderboard")}
              className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-yellow-400/25"
            >
              <span className="text-xl">🏆</span>
              <p className="text-sm font-semibold text-white">Leaderboard</p>
              <p className="text-[10px] text-gray-600">Топ бойцов</p>
            </button>
          </div>
        </section>

        {/* ── SIGN OUT ── */}
        <section className="mt-8">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-2xl border border-red-500/20 bg-red-500/[0.06] py-3.5 text-sm font-semibold text-red-400/90 transition hover:border-red-500/40 hover:bg-red-500/10 active:scale-[0.99]"
          >
            Выйти из аккаунта
          </button>
        </section>

      </div>
    </div>
  );
}
