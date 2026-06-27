"use client";

import { motion } from "framer-motion";
import type { GymSplit } from "@/lib/supabase/splits-sync";
import {
  SPLIT_CLIENT_GROSS_RUB,
} from "@/lib/supabase/split-booking";

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
      className="rounded-xl border border-white/[0.08] bg-black/50 px-3.5 py-3 transition-all duration-300 ease-out"
      style={{ boxShadow: `0 0 24px -14px ${hexColor}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight text-white">
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
          <p className="mt-0.5 text-[9px] text-neutral-500">Включена спортивная страховка</p>
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

type GymScheduleProps = {
  splits: GymSplit[];
  loading: boolean;
  hexColor: string;
  displayCoach: string;
  busyId: string | null;
  clientId?: string;
  onBook: (splitId: string) => void;
};

export function GymSchedule({
  splits,
  loading,
  hexColor,
  displayCoach,
  busyId,
  clientId,
  onBook,
}: GymScheduleProps) {
  const coachLabel = displayCoach !== "Уточняется" ? displayCoach : undefined;

  return (
    <section id="gym-schedule" className="mt-4">
      <h3 className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.32em] text-neutral-400">
        Ближайшие сплиты
      </h3>

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
              displayCoachName={coachLabel ?? split.coachName}
              onBook={onBook}
            />
          ))
        )}
      </div>

      {splits.some((s) => !s.isBookedByMe && s.bookedCount < s.maxSeats) ? (
        <motion.button
          type="button"
          disabled={!!busyId || !clientId}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const target = splits.find(
              (s) => !s.isBookedByMe && s.bookedCount < s.maxSeats,
            );
            if (target) onBook(target.id);
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
    </section>
  );
}
