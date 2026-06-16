"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import type { WarriorRole } from "@/lib/roles";
import { canRecordSessions } from "@/lib/roles";
import type { TrainingSplit } from "@/lib/splits";
import {
  fetchSplits,
  createSplit,
  cancelSplit,
} from "@/lib/supabase/splits-sync";
import { handleBookSplit } from "@/lib/supabase/split-booking";
import { SplitCreator } from "@/components/split-creator";
import { SplitCard } from "@/components/split-card";

const DEMO_COACH_ID = "WP-COACH-001";

const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

type SplitsBoardProps = {
  currentFighterId: string;
  role: WarriorRole;
  adminMode: boolean;
  client: SupabaseClient | null;
};

/**
 * Splits board — shows all open split sessions.
 * Coaches/admins see the SplitCreator panel at the top.
 * All users see the list of SplitCards with booking actions.
 */
export function SplitsBoard({
  currentFighterId,
  role,
  adminMode,
  client,
}: SplitsBoardProps) {
  const [splits, setSplits] = useState<TrainingSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [echo, setEcho] = useState<string | null>(null);

  const canCreate = canRecordSessions(role) || adminMode;
  const noClient = client === null;

  const refresh = useCallback(async () => {
    if (!client) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await fetchSplits(client, {
        statuses: ["waiting", "active"],
        currentFighterId,
      });

      setSplits(data);
    } catch (err) {
      console.error("[SplitsBoard] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [client, currentFighterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(
    async (payload: {
      topic: string;
      pricePerSeat: number;
      maxSeats: number;
    }) => {
      if (!client) return { error: new Error("Supabase not configured") };

      const coachId = role === "admin" ? "WP-ADMIN-001" : DEMO_COACH_ID;
      const { error } = await createSplit(client, { ...payload, coachId });

      if (!error) void refresh();
      return { error };
    },
    [client, role, refresh],
  );

  const handleBook = useCallback(
    async (splitId: string) => {
      if (!client)
        return { activated: false, error: new Error("Supabase not configured") };

      const result = await handleBookSplit(client, {
        clientId: currentFighterId,
        splitId,
      });
      if (result.ok) {
        if (result.activated) setEcho("Сплит активирован — бойцы набраны!");
        else setEcho("Место занято · −2 000 ₽ · +1 streak");
        void refresh();
        return { activated: result.activated, error: null };
      }

      return { activated: false, error: new Error(result.message) };
    },
    [client, currentFighterId, refresh],
  );

  const handleCancel = useCallback(
    async (splitId: string) => {
      if (!client) return { error: new Error("Supabase not configured") };

      const { error } = await cancelSplit(client, splitId);
      if (!error) void refresh();
      return { error };
    },
    [client, refresh],
  );

  return (
    <div className="space-y-5">
      {/* Coach / Admin: split creator */}
      {canCreate ? (
        <SplitCreator coachId={DEMO_COACH_ID} onSubmit={handleCreate} />
      ) : null}

      {/* Echo notification */}
      <AnimatePresence>
        {echo ? (
          <motion.p
            key={echo}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() =>
              setTimeout(() => setEcho(null), 2400)
            }
            className="rounded-full border border-emerald-400/40 bg-emerald-500/[0.09] px-4 py-2 text-center font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.24em] text-emerald-200"
          >
            {echo}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* Splits list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.38em] text-cyan-300/95">
            Открытые сплиты
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-full border border-white/[0.08] bg-black/45 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:border-cyan-400/35 hover:text-cyan-300 disabled:opacity-40"
          >
            {loading ? "Загружаю…" : "Обновить"}
          </button>
        </div>

        {noClient ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-6 text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-amber-200">
            Supabase не настроен · запусти миграцию 0002
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-white/[0.07] bg-zinc-950/55 px-4 py-8 text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-zinc-600">
            Загружаю сплиты…
          </div>
        ) : splits.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-zinc-950/55 px-4 py-8 text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-zinc-600">
            {canCreate
              ? "Нет открытых сплитов · создай первый выше"
              : "Нет открытых сплитов · тренер ещё не создал"}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {splits.map((s) => (
                <SplitCard
                  key={s.id}
                  split={s}
                  currentFighterId={currentFighterId}
                  fmtRub={fmtRub}
                  onBook={handleBook}
                  onCancel={canCreate ? handleCancel : undefined}
                  canManage={canCreate}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="font-[family-name:var(--font-geist-mono)] text-[10px] leading-relaxed text-zinc-600">
        Минимум {4} брони → статус{" "}
        <span className="text-emerald-400">АКТИВНО</span>. Максимум 6 мест.
        Комиссия платформы 19% вычитается из цены каждого места.
      </p>
    </div>
  );
}
