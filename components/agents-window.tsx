"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchMonthlyXpLeaderboard,
  type MonthlyXpLeader,
} from "@/lib/supabase/read";
import { setFighterWinner } from "@/lib/supabase/admin-actions";

type AgentsWindowProps = {
  open: boolean;
  client: SupabaseClient | null;
  /** Called once a winner status has been flipped (so the parent can re-hydrate). */
  onWinnerChange?: (fighterId: string, isWinner: boolean) => void;
  onClose: () => void;
};

const fmtXp = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * Admin-only modal: monthly XP leaderboard + per-row "Назначить победителя"
 * action that writes `is_winner: true` back into Supabase `fighter_stats`.
 */
export function AgentsWindow({
  open,
  client,
  onClose,
  onWinnerChange,
}: AgentsWindowProps) {
  const [rows, setRows] = useState<MonthlyXpLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [echo, setEcho] = useState<
    { tone: "ok" | "err"; message: string } | null
  >(null);

  const refresh = useCallback(async () => {
    if (!client) {
      setRows([]);
      setLoading(false);
      setEcho({
        tone: "err",
        message: "Supabase env vars missing · cannot fetch monthly ledger",
      });
      return;
    }

    setLoading(true);

    try {
      const data = await fetchMonthlyXpLeaderboard(client, {
        days: 30,
        limit: 10,
      });

      setRows(data);
    } catch (error) {
      console.error("[Agents Window] monthly ledger fetch failed:", error);
      setEcho({
        tone: "err",
        message: (error as Error).message ?? "Fetch failed",
      });
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!open) return;

    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!echo || echo.tone !== "ok") return undefined;

    const id = window.setTimeout(() => setEcho(null), 3600);

    return () => window.clearTimeout(id);
  }, [echo]);

  const handleSetWinner = useCallback(
    async (fighterId: string, nextIsWinner: boolean) => {
      if (!client) return;

      setBusyId(fighterId);

      try {
        const { error } = await setFighterWinner(
          client,
          fighterId,
          nextIsWinner,
        );

        if (error) {
          setEcho({ tone: "err", message: error.message });
          return;
        }

        setEcho({
          tone: "ok",
          message: nextIsWinner
            ? `${fighterId} → Winner of the Month`
            : `${fighterId} → status cleared`,
        });

        // Optimistic patch so the row updates immediately, then re-fetch.
        setRows((prev) =>
          prev.map((r) =>
            r.fighterSlug === fighterId
              ? {
                  ...r,
                  isWinner: nextIsWinner,
                  currentStatus: nextIsWinner ? "Winner of the Month" : null,
                }
              : r,
          ),
        );

        onWinnerChange?.(fighterId, nextIsWinner);

        void refresh();
      } finally {
        setBusyId(null);
      }
    },
    [client, onWinnerChange, refresh],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="agents-veil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 px-3 pb-24 pt-10 backdrop-blur-md sm:items-center sm:px-4 sm:pb-4"
          aria-hidden={false}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agents-window-title"
            initial={{ y: 18, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-400/40 bg-zinc-950/95 p-[1px] shadow-[0_0_70px_-10px_rgba(250,204,21,0.45)]"
          >
            <div className="rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-amber-500/[0.07] via-black/85 to-black/95 px-5 py-6 sm:px-7 sm:py-8">
              <header className="flex items-start justify-between gap-3 border-b border-amber-400/15 pb-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/95">
                    Admin Panel · Trophy
                  </p>
                  <h2
                    id="agents-window-title"
                    className="mt-1 font-[family-name:var(--font-geist-mono)] text-xl font-semibold uppercase tracking-[0.16em] text-white sm:text-2xl"
                  >
                    Agents Window
                  </h2>
                  <p className="mt-2 max-w-md font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">
                    Monthly XP leaders · кандидаты на «Winner of the Month»
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Agents Window"
                  className="rounded-md border border-white/[0.1] bg-black/65 px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:border-amber-300 hover:text-amber-200"
                >
                  esc
                </button>
              </header>

              <AnimatePresence>
                {echo ? (
                  <motion.p
                    key={echo.message}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={
                      echo.tone === "ok"
                        ? "mt-4 rounded-full border border-amber-400/40 bg-amber-500/[0.1] px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.2em] text-amber-200"
                        : "mt-4 rounded-full border border-rose-500/40 bg-rose-500/[0.08] px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.18em] text-rose-200"
                    }
                  >
                    {echo.message}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/55 shadow-[inset_0_0_0_1px_rgba(250,204,21,0.04)]">
                <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4.5rem_minmax(7.5rem,auto)] gap-2 border-b border-amber-400/15 bg-black/65 px-3 py-2.5 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-amber-300/95 sm:grid-cols-[3rem_minmax(0,1fr)_5.5rem_5.5rem_minmax(11rem,auto)] sm:gap-3 sm:px-4 sm:text-[10.5px]">
                  <span>#</span>
                  <span>Fighter</span>
                  <span className="text-right">XP·30d</span>
                  <span className="text-right">Sess</span>
                  <span className="text-right">Action</span>
                </div>

                <ul className="max-h-[60vh] divide-y divide-white/[0.05] overflow-y-auto">
                  {loading ? (
                    <li className="px-4 py-8 text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                      Loading monthly ledger…
                    </li>
                  ) : rows.length === 0 ? (
                    <li className="px-4 py-8 text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                      Нет сессий за последние 30 дней
                    </li>
                  ) : (
                    rows.map((row) => {
                      const busy = busyId === row.fighterSlug;
                      const isWinner = row.isWinner;

                      return (
                        <li
                          key={row.fighterSlug}
                          className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4.5rem_minmax(7.5rem,auto)] items-center gap-2 px-3 py-2.5 sm:grid-cols-[3rem_minmax(0,1fr)_5.5rem_5.5rem_minmax(11rem,auto)] sm:gap-3 sm:px-4 sm:py-3"
                        >
                          <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-amber-200/95 sm:text-sm">
                            #{row.rank}
                          </span>

                          <span className="min-w-0 truncate">
                            <span className="font-[family-name:var(--font-geist-mono)] text-[12.5px] uppercase tracking-[0.08em] text-zinc-200 sm:text-[13.5px]">
                              {row.displayName}
                            </span>
                            {isWinner ? (
                              <span className="ml-2 inline-flex items-center rounded-full border border-amber-400/55 bg-amber-500/[0.12] px-2 py-[1px] font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.2em] text-amber-200">
                                ★ Winner
                              </span>
                            ) : null}
                          </span>

                          <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-amber-200">
                            {fmtXp.format(row.xp30d)}
                          </span>

                          <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-zinc-400">
                            {row.sessions30d}
                          </span>

                          <span className="text-right">
                            <motion.button
                              type="button"
                              disabled={busy || !client}
                              onClick={() =>
                                void handleSetWinner(
                                  row.fighterSlug,
                                  !isWinner,
                                )
                              }
                              whileTap={{ scale: busy ? 1 : 0.96 }}
                              className={
                                isWinner
                                  ? "rounded-full border border-rose-400/45 bg-rose-500/[0.1] px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200 transition-colors hover:border-rose-300 hover:text-rose-100 disabled:opacity-50"
                                  : "rounded-full border border-amber-400/55 bg-amber-500/[0.1] px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 shadow-[0_0_22px_-8px_rgba(250,204,21,0.65)] transition-colors hover:border-amber-300 hover:text-amber-100 disabled:opacity-50"
                              }
                            >
                              {busy
                                ? "СИНХ…"
                                : isWinner
                                  ? "СНЯТЬ"
                                  : "НАЗНАЧИТЬ"}
                            </motion.button>
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[10.5px] leading-relaxed text-zinc-500">
                Источник: SUM(<span className="text-zinc-300">xp_awarded</span>)
                по <span className="text-zinc-300">training_sessions</span> за
                30 дней. Кнопка пишет{" "}
                <span className="text-amber-200">is_winner: true</span> в{" "}
                <span className="text-zinc-300">fighter_stats</span> и
                добавляет immutable строку в{" "}
                <span className="text-zinc-300">fighter_awards</span>.
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
