"use client";

/**
 * GymPopup — IRON WILL · Stitch vertical bottom sheet.
 *
 * Slides up from the bottom of the map frame when a gym hex marker is tapped.
 * Shows nearest open splits with live seat counts and a neon booking CTA
 * wired to `handleBookSplit` (19% / 81% fintech flow).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GymEntry } from "@/lib/gyms";
import { CATEGORY_LABELS, GYM_ACCENT_HEX } from "@/lib/gyms";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { fetchGymSplits, type GymSplit } from "@/lib/supabase/splits-sync";
import {
  handleBookSplit,
  SPLIT_CLIENT_GROSS_RUB,
} from "@/lib/supabase/split-booking";

type GymPopupProps = {
  gym: GymEntry;
  onClose: () => void;
  clientId?: string;
  onBooked?: (msg: string) => void;
};

const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function SplitCard({
  split,
  hexColor,
  busy,
  displayCoachName,
  onBook,
}: {
  split: GymSplit;
  hexColor: string;
  busy: boolean;
  displayCoachName: string;
  onBook: (splitId: string) => void;
}) {
  const isFull = split.bookedCount >= split.maxSeats;
  const price = split.pricePerSeat || SPLIT_CLIENT_GROSS_RUB;

  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-black/50 px-3.5 py-3"
      style={{ boxShadow: `0 0 24px -14px ${hexColor}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-geist-sans)] text-[13px] font-semibold tracking-tight text-white">
            {displayCoachName}
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.14em] text-neutral-500">
            {split.timeLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
          {split.bookedCount} из {split.maxSeats}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[22px] font-bold tabular-nums text-white">
            {fmtRub.format(price)}
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-geist-sans)] text-[9px] text-neutral-500">
            Включена спортивная страховка
          </p>
        </div>

        {split.isBookedByMe ? (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-300">
            ✓ Записан
          </span>
        ) : isFull ? (
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.14em] text-neutral-600">
            Мест нет
          </span>
        ) : (
          <motion.button
            type="button"
            disabled={busy}
            whileTap={{ scale: 0.96 }}
            onClick={() => onBook(split.id)}
            className="rounded-full border px-4 py-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-50"
            style={{
              borderColor: `${hexColor}88`,
              background: `${hexColor}18`,
              color: hexColor,
              boxShadow: `0 0 20px -6px ${hexColor}`,
            }}
          >
            {busy ? "…" : "Записаться"}
          </motion.button>
        )}
      </div>
    </div>
  );
}

export function GymPopup({ gym, onClose, clientId, onBooked }: GymPopupProps) {
  const hexColor = GYM_ACCENT_HEX[gym.accent];
  const categoryLabel = CATEGORY_LABELS[gym.category];

  const client = useMemo(() => createWarriorBrowserClient(), []);
  const [splits, setSplits] = useState<GymSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [echo, setEcho] = useState<{ tone: "ok" | "err"; msg: string } | null>(
    null,
  );

  const displayCoach =
    gym.featuredAthletes?.[0]?.displayName ?? gym.coachName ?? "Тренер";

  const loadSplits = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchGymSplits(client, {
        gymId: gym.id,
        coachId: gym.coachId || undefined,
        currentFighterId: clientId,
      });
      setSplits(data);
    } catch {
      setSplits([]);
    } finally {
      setLoading(false);
    }
  }, [client, gym.id, gym.coachId, clientId]);

  useEffect(() => {
    void loadSplits();
  }, [loadSplits]);

  const handleBook = async (splitId: string) => {
    if (!client) {
      setEcho({ tone: "err", msg: "Supabase не настроен" });
      return;
    }
    if (!clientId) {
      setEcho({ tone: "err", msg: "Войди в аккаунт для записи" });
      return;
    }

    setBusyId(splitId);
    setEcho(null);

    const result = await handleBookSplit(client, { clientId, splitId });

    setBusyId(null);

    if (!result.ok) {
      setEcho({ tone: "err", msg: result.message });
      return;
    }

    const msg = result.activated
      ? "Записан · сплит АКТИВЕН · +1 streak · +1 билет"
      : "Записан на сплит · +1 streak · +1 билет";

    setEcho({ tone: "ok", msg });
    onBooked?.(msg);
    void loadSplits();
    setTimeout(() => setEcho(null), 4000);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[1050] bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute inset-x-0 bottom-0 z-[1100] max-h-[72%] overflow-hidden rounded-t-3xl border border-white/[0.1] bg-zinc-950/98 shadow-[0_-24px_80px_rgba(0,0,0,0.85)]"
        style={{
          boxShadow: `0 -8px 60px -12px ${hexColor}55, 0 -24px 80px rgba(0,0,0,0.85)`,
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        <div
          className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            background: `linear-gradient(180deg, ${hexColor}12 0%, rgba(9,9,11,0.98) 28%)`,
          }}
        >
          {/* IRON WILL header block */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-bold uppercase tracking-[0.38em] text-neutral-500">
                IRON WILL · {categoryLabel}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-geist-sans)] text-xl font-bold tracking-tight text-white">
                {gym.name}
              </h2>
              <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                {gym.city} · {gym.address}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="shrink-0 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-neutral-500 hover:text-white"
            >
              esc
            </button>
          </div>

          <hr className="my-4 border-white/[0.07]" />

          {/* Nearest splits */}
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.32em] text-neutral-400">
            Ближайшие сплиты
          </p>

          <div className="mt-3 space-y-2.5">
            {loading ? (
              <p className="py-6 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.22em] text-neutral-600">
                Загрузка расписания…
              </p>
            ) : splits.length === 0 ? (
              <p className="rounded-xl border border-white/[0.06] bg-black/40 px-3 py-4 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.16em] text-neutral-600">
                Нет открытых сплитов · проверь миграцию 0009
              </p>
            ) : (
              splits.map((split) => (
                <SplitCard
                  key={split.id}
                  split={split}
                  hexColor={hexColor}
                  busy={busyId === split.id}
                  displayCoachName={displayCoach !== "Уточняется" ? displayCoach : split.coachName}
                  onBook={(id) => void handleBook(id)}
                />
              ))
            )}
          </div>

          {/* Primary CTA — books first available split */}
          {splits.some((s) => !s.isBookedByMe && s.bookedCount < s.maxSeats) ? (
            <motion.button
              type="button"
              disabled={!!busyId || !clientId}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const target = splits.find(
                  (s) => !s.isBookedByMe && s.bookedCount < s.maxSeats,
                );
                if (target) void handleBook(target.id);
              }}
              className="mt-5 w-full rounded-2xl border py-3.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-extrabold uppercase tracking-[0.28em] text-white transition-opacity disabled:opacity-45"
              style={{
                borderColor: `${hexColor}aa`,
                background: `linear-gradient(180deg, ${hexColor}33 0%, ${hexColor}12 100%)`,
                boxShadow: `0 0 32px -6px ${hexColor}, inset 0 0 20px -10px ${hexColor}`,
              }}
            >
              {busyId ? "Обработка…" : "Записаться на сплит"}
            </motion.button>
          ) : null}

          {!clientId ? (
            <p className="mt-3 text-center font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-amber-400/80">
              Войди через Passport для оплаты сплита
            </p>
          ) : null}

          <AnimatePresence>
            {echo ? (
              <motion.p
                key={echo.msg}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={[
                  "mt-3 rounded-xl px-3 py-2 text-center font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.16em]",
                  echo.tone === "ok"
                    ? "border border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                    : "border border-rose-400/35 bg-rose-500/10 text-rose-200",
                ].join(" ")}
              >
                {echo.msg}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
