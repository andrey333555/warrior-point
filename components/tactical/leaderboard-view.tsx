"use client";

/**
 * LeaderboardView — Tactical Fighter OS · Screen 2 (Lovable canon).
 *
 * Ranking is sourced from Supabase `fighter_stats` ordered by `elo_rating`
 * (resilient: falls back to total_xp) and hydrated with `profiles.display_name`.
 *
 * WEEK / MONTH / YEAR re-scales the 30-day rating delta window. Pro-record,
 * city and delta are synthesised deterministically from the fighter slug
 * until those columns exist server-side — STABLE across renders.
 *
 * The current authenticated user's row is detected and highlighted with a
 * neon "• YOU" marker; their ELO is tinted with the active role accent.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { fetchEloLeaderboard, type EloLeader } from "@/lib/supabase/read";

type Range = "week" | "month" | "year";

const RANGE_DELTA_SCALE: Record<Range, number> = { week: 0.4, month: 1, year: 2.4 };

const CITIES = [
  "МАХАЧКАЛА",
  "КРАСНОДАР",
  "МОСКВА",
  "ГРОЗНЫЙ",
  "С-ПЕТЕРБУРГ",
  "АНАПА",
  "СОЧИ",
  "НОВОРОССИЙСК",
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

type Row = EloLeader & { city: string; proRecord: string; baseDelta: number };

function decorate(r: EloLeader): Row {
  const h = hash(r.fighterSlug);
  const wins = 18 + (h % 16);
  const losses = h % 5;
  const draws = (h >> 3) % 2;
  return {
    ...r,
    city: CITIES[h % CITIES.length],
    proRecord: draws ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`,
    baseDelta: 6 + ((h >> 5) % 40),
  };
}

export function LeaderboardView({
  currentUserId,
  roleAccent = "#00F0FF",
  weightClass = "LIGHTWEIGHT",
}: {
  currentUserId?: string;
  roleAccent?: string;
  weightClass?: string;
}) {
  const [range, setRange] = useState<Range>("month");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [noConfig, setNoConfig] = useState(false);

  const client = useMemo(() => createWarriorBrowserClient(), []);

  useEffect(() => {
    let aborted = false;
    if (!client) {
      setNoConfig(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const data = await fetchEloLeaderboard(client, { limit: 12 });
        if (aborted) return;
        setRows(data.map(decorate));
      } catch (err) {
        console.error("[Leaderboard] fetch error:", err);
        if (!aborted) setRows([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [client]);

  const scale = RANGE_DELTA_SCALE[range];

  return (
    <div className="flex h-full min-h-0 flex-col px-5 pt-5">
      {/* ── Tactical eyebrow ─────────────────────────────────────────────── */}
      <p className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.32em] text-neutral-500">
        Global Ranking <span className="text-neutral-700">•</span>{" "}
        <span className="text-neutral-400">{weightClass}</span>
      </p>

      {/* ── Title + range tabs ───────────────────────────────────────────── */}
      <div className="mt-1 flex shrink-0 items-center justify-between gap-3">
        <h1
          className="font-[family-name:var(--font-geist-sans)] text-[clamp(1.7rem,7.5vw,2.4rem)] font-bold leading-none tracking-tight text-white"
          style={{ textShadow: "0 0 10px rgba(255,255,255,0.1)" }}
        >
          LEADERBOARD
        </h1>
      </div>

      <div className="mt-3 flex shrink-0 self-start rounded-full border border-neutral-800 bg-black/40 p-0.5">
        {(["week", "month", "year"] as Range[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={
              range === r
                ? "rounded-full border border-white/25 bg-white/[0.06] px-3 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-white"
                : "rounded-full border border-transparent px-3 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-600 transition-colors hover:text-neutral-300"
            }
          >
            {r}
          </button>
        ))}
      </div>

      {/* ── Table header ─────────────────────────────────────────────────── */}
      <div className="mt-4 grid shrink-0 grid-cols-[1.6rem_minmax(0,1fr)_3.2rem_3.2rem_2.4rem] items-center gap-2 border-b border-neutral-800 pb-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-medium uppercase tracking-[0.16em] text-neutral-600">
        <span>#</span>
        <span>Fighter</span>
        <span className="text-right">Rec</span>
        <span className="text-right">Elo</span>
        <span className="text-right">Δ</span>
      </div>

      {/* ── Rows ─────────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? (
          <p className="py-10 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.25em] text-neutral-600">
            Загрузка реестра…
          </p>
        ) : noConfig ? (
          <p className="mt-4 rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.18em] text-amber-200">
            Supabase keys missing · set NEXT_PUBLIC_* in .env.local
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.25em] text-neutral-600">
            Нет данных в реестре
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((row, i) => {
              const isYou = !!currentUserId && row.fighterSlug === currentUserId;
              const delta = Math.max(1, Math.round(row.baseDelta * scale));

              return (
                <motion.li
                  key={row.fighterSlug}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025, type: "spring", stiffness: 320, damping: 28 }}
                  className="grid grid-cols-[1.6rem_minmax(0,1fr)_3.2rem_3.2rem_2.4rem] items-center gap-2 rounded-xl border px-2.5 py-2.5"
                  style={
                    isYou
                      ? { borderColor: `${roleAccent}66`, background: `${roleAccent}0f` }
                      : { borderColor: "rgba(38,38,38,1)", background: "rgba(24,24,27,0.6)" }
                  }
                >
                  {/* Rank */}
                  <span
                    className={[
                      "font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-bold tabular-nums",
                      i === 0 ? "text-amber-300" : i === 1 ? "text-neutral-200" : i === 2 ? "text-orange-300/90" : "text-neutral-500",
                    ].join(" ")}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Name + city */}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-[family-name:var(--font-geist-sans)] text-[13px] font-semibold tracking-tight text-neutral-100">
                        {row.displayName}
                      </span>
                      {row.isWinner ? <span className="text-amber-400">★</span> : null}
                      {isYou ? (
                        <span
                          className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[8px] font-bold uppercase tracking-[0.18em]"
                          style={{ color: roleAccent, textShadow: `0 0 8px ${roleAccent}` }}
                        >
                          • YOU
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate font-[family-name:var(--font-jetbrains-mono)] text-[8.5px] uppercase tracking-[0.18em] text-neutral-600">
                      {row.city}
                    </span>
                  </span>

                  {/* Pro record */}
                  <span className="text-right font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium tabular-nums text-neutral-400">
                    {row.proRecord}
                  </span>

                  {/* ELO */}
                  <span
                    className="text-right font-[family-name:var(--font-jetbrains-mono)] text-[14px] font-bold tabular-nums"
                    style={{ color: isYou ? roleAccent : "#e5e5e5" }}
                  >
                    {row.elo}
                  </span>

                  {/* Delta */}
                  <span className="text-right font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold tabular-nums text-emerald-400">
                    +{delta}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
