"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BOOKING_TYPE_LABEL,
  useBookings,
  type Booking,
} from "@/lib/bookings";

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

function BookingCard({ booking, index }: { booking: Booking; index: number }) {
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

      <button
        type="button"
        className="mt-3 w-full rounded-xl bg-zinc-800 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Открыть
      </button>
    </motion.div>
  );
}

export default function MyTrainings() {
  const router = useRouter();
  const bookings = useBookings();

  const upcoming = bookings.filter((b) => b.status === "upcoming");
  const history = bookings.filter((b) => b.status === "completed");

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <header className="flex items-center justify-between px-4 py-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
        >
          ← OS
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
            <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center">
              <p className="text-sm text-gray-500">Пока нет записей</p>
              <button
                type="button"
                onClick={() => router.push("/trainer/1")}
                className="mt-3 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black"
              >
                Записаться
              </button>
            </div>
          ) : (
            <div className="space-y-3">
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
            <div className="space-y-3 opacity-70">
              {history.map((b, i) => (
                <BookingCard key={b.id} booking={b} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
