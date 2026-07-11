"use client";

import { motion } from "framer-motion";
import { useBackOrHome } from "@/hooks/use-back-or-home";
import { useBookings, BOOKING_TYPE_LABEL, type Booking } from "@/lib/bookings";
import { EmptyState } from "@/components/ui/empty-state";

function HistoryRow({ booking, index }: { booking: Booking; index: number }) {
  const isUpcoming = booking.status === "upcoming";
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.03 * index }}
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
      <span className="shrink-0 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-400">
        {BOOKING_TYPE_LABEL[booking.type]}
      </span>
    </motion.div>
  );
}

export default function TrainingsHistoryPage() {
  const goBack = useBackOrHome("/profile");
  const bookings = useBookings();

  const upcoming = bookings.filter((b) => b.status === "upcoming");
  const completed = bookings.filter((b) => b.status === "completed");

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-black pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-white">
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={goBack}
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
        >
          ← Назад
        </button>
        <h1 className="text-lg font-bold">Все тренировки</h1>
      </header>

      <div className="px-4">
        {upcoming.length > 0 ? (
          <section className="mb-6">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-gray-600">
              Ближайшие ({upcoming.length})
            </p>
            <div className="space-y-2">
              {upcoming.map((b, i) => (
                <HistoryRow key={b.id} booking={b} index={i} />
              ))}
            </div>
          </section>
        ) : null}

        {completed.length > 0 ? (
          <section>
            <p className="mb-3 text-[10px] uppercase tracking-wider text-gray-600">
              История ({completed.length})
            </p>
            <div className="space-y-2">
              {completed.map((b, i) => (
                <HistoryRow key={b.id} booking={b} index={i} />
              ))}
            </div>
          </section>
        ) : null}

        {bookings.length === 0 ? (
          <EmptyState
            icon="🥊"
            title="Пока нет тренировок"
            description="Запишись к тренеру или пройди AI-подбор"
            actionLabel="Найти тренера"
            actionHref="/ai-match"
          />
        ) : null}
      </div>
    </div>
  );
}
