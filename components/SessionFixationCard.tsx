"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  SYSTEM_VALUE,
  createPendingSession,
  getActivePendingSession,
  formatSessionKey,
  type FixationSession,
} from "@/lib/session-fixation";
import { fixationAwaitingCount } from "@/lib/fixation-sync";

type SessionFixationCardProps = {
  fighterId: string;
  trainerId?: string;
  trainerName?: string;
  gymId?: string;
  gymName?: string;
  /** Booking flow — без боковых отступов и с простым языком */
  embedded?: boolean;
  onSessionCreated?: (session: FixationSession) => void;
};

export default function SessionFixationCard({
  fighterId,
  trainerId = "1",
  trainerName = "Тренер",
  gymId = "kuznya-krd-main",
  gymName = "Зал",
  embedded = false,
  onSessionCreated,
}: SessionFixationCardProps) {
  const [pending, setPending] = useState<FixationSession | null>(null);
  const [awaitingSync, setAwaitingSync] = useState(0);

  const refresh = useCallback(() => {
    setPending(getActivePendingSession(fighterId));
    setAwaitingSync(fixationAwaitingCount(fighterId));
  }, [fighterId]);

  useEffect(() => {
    refresh();
    const onOnline = () => refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  const handleCreateKey = () => {
    const session = createPendingSession({
      fighterId,
      trainerId,
      trainerName,
      gymId,
      gymName,
    });
    setPending(session);
    onSessionCreated?.(session);
  };

  return (
    <section
      className={
        embedded
          ? "overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.06] via-zinc-900/90 to-black/90"
          : "mx-5 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.06] via-zinc-900/90 to-black/90"
      }
      style={{ boxShadow: "0 0 28px -12px rgba(34,211,238,0.25)" }}
    >
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
          Перед тренировкой
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-geist-sans)] text-[15px] font-bold text-white">
          Подтверди в зале — получи XP
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          {SYSTEM_VALUE.subline}
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-amber-200/90">
            ⚠️ Без подтверждения в зале — тренировка не попадёт в рейтинг и паспорт.
          </p>
        </div>

        {pending ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-3"
          >
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-cyan-300/70">
              Код тренировки
            </p>
            <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-xl font-bold tracking-widest text-cyan-100">
              {formatSessionKey(pending.sessionKey)}
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              {trainerName} · подтверди у тренера в зале
            </p>
            <Link
              href={`/check-in/${pending.trainerId}?key=${pending.sessionKey}`}
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-3 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-500/25"
            >
              Подтвердить в зале →
            </Link>
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={handleCreateKey}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 py-3.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-500/20"
          >
            🥊 Готов к тренировке
          </button>
        )}

        {awaitingSync > 0 ? (
          <p className="text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.14em] text-amber-300">
            ⏱ {awaitingSync} подтверждено · синхронизируется при появлении сети
          </p>
        ) : null}
      </div>
    </section>
  );
}
