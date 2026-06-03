"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  SPLIT_STATUS_LABELS,
  SPLIT_STATUS_STYLE,
  type TrainingSplit,
} from "@/lib/splits";

type SplitCardProps = {
  split: TrainingSplit;
  currentFighterId: string;
  fmtRub: Intl.NumberFormat;
  onBook: (splitId: string) => Promise<{ activated: boolean; error: Error | null }>;
  onCancel?: (splitId: string) => Promise<{ error: Error | null }>;
  canManage?: boolean;
};

/**
 * Cyber-Loft card for a single split-training session.
 * Shows seat progress dots, status badge, price, and a "Занять место" CTA.
 * When the minimum booking count is hit the card pulses and status flips to ACTIVE.
 */
export function SplitCard({
  split,
  currentFighterId: _currentFighterId,
  fmtRub,
  onBook,
  onCancel,
  canManage = false,
}: SplitCardProps) {
  const [localSplit, setLocalSplit] = useState(split);
  const [busy, setBusy] = useState(false);
  const [echo, setEcho] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  const st = SPLIT_STATUS_STYLE[localSplit.status];
  const isClosed = localSplit.status === "done" || localSplit.status === "cancelled";
  const isFull = localSplit.bookedCount >= localSplit.maxSeats;
  const canBook = !localSplit.isBookedByMe && !isClosed && !isFull;

  const platformFee = Math.round(localSplit.pricePerSeat * 0.19);
  const netPerSeat = localSplit.pricePerSeat - platformFee;

  const handleBook = async () => {
    setBusy(true);
    setEcho(null);

    const { activated, error } = await onBook(localSplit.id);

    setBusy(false);

    if (error) {
      setEcho({ tone: "err", msg: error.message });
      return;
    }

    const newCount = localSplit.bookedCount + 1;
    setLocalSplit((prev) => ({
      ...prev,
      bookedCount: newCount,
      isBookedByMe: true,
      status: activated ? "active" : prev.status,
    }));

    setEcho({
      tone: "ok",
      msg: activated ? "Место занято · сплит АКТИВЕН!" : "Место занято",
    });
    setTimeout(() => setEcho(null), 3000);
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setBusy(true);
    const { error } = await onCancel(localSplit.id);
    setBusy(false);

    if (error) {
      setEcho({ tone: "err", msg: error.message });
      return;
    }

    setLocalSplit((prev) => ({ ...prev, status: "cancelled" }));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`overflow-hidden rounded-2xl border ${st.border} ${st.bg} p-[1px]`}
      style={
        localSplit.status === "active"
          ? { boxShadow: "0 0 38px -12px rgba(52,211,153,0.45)" }
          : undefined
      }
    >
      <div className="rounded-[calc(1rem-1px)] bg-black/60 p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
              Сплит · {new Date(localSplit.createdAt).toLocaleDateString("ru-RU")}
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-white sm:text-[17px]">
              {localSplit.topic}
            </h3>
          </div>

          {/* Status badge */}
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border ${st.border} ${st.bg} px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.24em] ${st.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden />
            {SPLIT_STATUS_LABELS[localSplit.status]}
          </span>
        </div>

        {/* Seat dots */}
        <div className="mt-4 flex items-center gap-2">
          <span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.26em] text-zinc-500">
            Места
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: localSplit.maxSeats }, (_, i) => {
              const filled = i < localSplit.bookedCount;
              const isMin = i === localSplit.minSeats - 1;

              return (
                <span
                  key={i}
                  className={[
                    "h-3.5 w-3.5 rounded-sm transition-colors",
                    filled
                      ? localSplit.status === "active"
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                        : "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                      : "bg-zinc-700",
                    isMin && !filled ? "ring-1 ring-amber-400/60" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={filled ? "Занято" : i < localSplit.minSeats ? "Нужно для старта" : "Свободно"}
                />
              );
            })}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] tabular-nums text-zinc-500">
            {localSplit.bookedCount}/{localSplit.maxSeats}
            {localSplit.bookedCount < localSplit.minSeats
              ? ` · нужно ещё ${localSplit.minSeats - localSplit.bookedCount}`
              : ""}
          </span>
        </div>

        {/* Price strip */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/35 px-4 py-2.5">
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.24em] text-zinc-500">
              Место · брутто
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-base font-bold tabular-nums text-white">
              {fmtRub.format(localSplit.pricePerSeat)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.24em] text-zinc-500">
              После 19% комиссии
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-cyan-300">
              {fmtRub.format(netPerSeat)}
              <span className="ml-1 text-[9.5px] text-zinc-500">/ тренеру</span>
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 space-y-2.5">
          {canBook ? (
            <motion.button
              type="button"
              disabled={busy}
              onClick={() => void handleBook()}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-full border border-cyan-400/50 bg-cyan-500/[0.09] py-3 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-100 shadow-[0_0_24px_-10px_rgba(34,211,238,0.55)] transition-opacity disabled:opacity-50"
            >
              {busy ? "Бронирую…" : "Занять место"}
            </motion.button>
          ) : localSplit.isBookedByMe ? (
            <div className="rounded-full border border-emerald-400/35 bg-emerald-500/[0.07] py-2.5 text-center font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.28em] text-emerald-200">
              ✓ Место занято
            </div>
          ) : isFull ? (
            <div className="rounded-full border border-zinc-600/35 bg-zinc-500/[0.06] py-2.5 text-center font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.24em] text-zinc-500">
              Мест нет
            </div>
          ) : null}

          {canManage && !isClosed ? (
            <motion.button
              type="button"
              disabled={busy}
              onClick={() => void handleCancel()}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-full border border-rose-400/30 bg-transparent py-2 font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.2em] text-rose-400 transition-colors hover:border-rose-400/55 hover:text-rose-300 disabled:opacity-50"
            >
              Отменить сплит
            </motion.button>
          ) : null}

          <AnimatePresence>
            {echo ? (
              <motion.p
                key={echo.msg}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={
                  echo.tone === "ok"
                    ? "rounded-full border border-emerald-400/35 bg-emerald-500/[0.09] px-4 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] text-emerald-200"
                    : "rounded-full border border-rose-400/35 bg-rose-500/[0.08] px-4 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-rose-200"
                }
              >
                {echo.msg}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
