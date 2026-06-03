"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { MIN_SPLIT_SEATS, MAX_SPLIT_SEATS } from "@/lib/splits";

type SplitCreatorProps = {
  coachId: string;
  onSubmit: (payload: {
    topic: string;
    pricePerSeat: number;
    maxSeats: number;
  }) => Promise<{ error: Error | null }>;
};

/**
 * Cyber-Loft form — coaches / admins create a new split session.
 * Validates: topic non-empty, price ≥ 0, seats 4–6.
 */
export function SplitCreator({ coachId: _coachId, onSubmit }: SplitCreatorProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [price, setPrice] = useState(1000);
  const [seats, setSeats] = useState(4);
  const [busy, setBusy] = useState(false);
  const [echo, setEcho] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  const seatOptions = Array.from(
    { length: MAX_SPLIT_SEATS - MIN_SPLIT_SEATS + 1 },
    (_, i) => MIN_SPLIT_SEATS + i,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setEcho({ tone: "err", msg: "Укажи тему тренировки" });
      return;
    }
    setBusy(true);
    setEcho(null);

    const { error } = await onSubmit({ topic: topic.trim(), pricePerSeat: price, maxSeats: seats });

    setBusy(false);
    if (error) {
      setEcho({ tone: "err", msg: error.message });
      return;
    }
    setEcho({ tone: "ok", msg: "Сплит создан · бойцы могут бронировать" });
    setTopic("");
    setPrice(1000);
    setSeats(4);
    setTimeout(() => { setOpen(false); setEcho(null); }, 2600);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-zinc-950/70 p-[1px] shadow-[0_0_40px_-14px_rgba(232,121,249,0.45)]">
      <div className="rounded-[calc(1rem-1px)] bg-gradient-to-br from-fuchsia-500/[0.06] via-transparent to-transparent">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.38em] text-fuchsia-300/95">
              Тренер · Панель
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              Создать сплит-тренировку
            </p>
          </div>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-fuchsia-400/40 bg-fuchsia-500/[0.1] text-fuchsia-300"
            aria-hidden
          >
            ↓
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-fuchsia-400/15 px-5 pb-5"
            >
              <div className="mt-5 space-y-4">
                {/* Topic */}
                <div className="space-y-1.5">
                  <label className="block font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                    Тема тренировки
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Например: Работа в клинче"
                    maxLength={80}
                    className="w-full rounded-xl border border-white/[0.1] bg-black/55 px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-fuchsia-400/55 focus:shadow-[0_0_0_1px_rgba(232,121,249,0.25)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Price */}
                  <div className="space-y-1.5">
                    <label className="block font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Цена / место (₽)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={price}
                      onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-xl border border-white/[0.1] bg-black/55 px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-zinc-100 outline-none transition-colors focus:border-fuchsia-400/55"
                    />
                  </div>

                  {/* Seats */}
                  <div className="space-y-1.5">
                    <label className="block font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Мест (4–6)
                    </label>
                    <div className="flex gap-2">
                      {seatOptions.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSeats(n)}
                          className={
                            seats === n
                              ? "flex-1 rounded-xl border border-fuchsia-400/60 bg-fuchsia-500/[0.14] py-2.5 font-[family-name:var(--font-geist-mono)] text-sm font-bold tabular-nums text-fuchsia-200"
                              : "flex-1 rounded-xl border border-white/[0.08] bg-black/45 py-2.5 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-zinc-400 transition-colors hover:border-fuchsia-400/40 hover:text-fuchsia-300"
                          }
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Info strip */}
                <p className="rounded-lg border border-white/[0.06] bg-black/35 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[10.5px] leading-relaxed text-zinc-500">
                  Статус&nbsp;
                  <span className="text-amber-200">ОЖИДАНИЕ</span>
                  &nbsp;→ при {MIN_SPLIT_SEATS} бронированиях автоматически&nbsp;
                  <span className="text-emerald-200">АКТИВНО</span>.
                  Комиссия платформы 19% удерживается из цены каждого места.
                </p>

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-full border border-fuchsia-400/50 bg-fuchsia-500/[0.1] py-3 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.3em] text-fuchsia-100 shadow-[0_0_28px_-10px_rgba(232,121,249,0.55)] transition-opacity disabled:opacity-50"
                >
                  {busy ? "Создаю…" : "Создать сплит"}
                </motion.button>

                <AnimatePresence>
                  {echo ? (
                    <motion.p
                      key={echo.msg}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={
                        echo.tone === "ok"
                          ? "rounded-full border border-emerald-400/35 bg-emerald-500/[0.09] px-4 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.2em] text-emerald-200"
                          : "rounded-full border border-rose-400/35 bg-rose-500/[0.08] px-4 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.2em] text-rose-200"
                      }
                    >
                      {echo.msg}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
