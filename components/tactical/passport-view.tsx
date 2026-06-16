"use client";

/**
 * PassportView — Tactical Fighter OS · Screen 1.
 *
 * Three independent display modes driven by the active role state:
 *   • FIGHTER  — Combat Score in the octagon · Record/ELO/Weight/Streak · PINK
 *   • COACH    — Gold "Создать Сплит" button   · Net 81%/Income/Sessions/Video · GOLD
 *   • ATHLETE  — Level + XP bar in the octagon  · Tickets/Streak/Insurance/Balance · CYAN
 *
 * Data is sourced from Supabase (profiles, fighter_stats, training_sessions)
 * via the props computed in TacticalOS. Mode swaps are instant + animated.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { CombatOctagon } from "@/components/tactical/combat-octagon";
import type { MetatronRole } from "@/components/metatrons-cube";
import { FightsList } from "@/components/fights-list";
import { LotusIcon } from "@/components/lotus-icon";
import { fightsForLeague } from "@/lib/mocks/league-fights";
import { buildOrgPetals, findOrg, getDemoFighterOrgRecord } from "@/data/organisations";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { syncWithSherdog, type SherdogSyncStatus } from "@/lib/sherdog-sync";
import {
  AcaLogo,
  RccLogo,
  FngLogo,
  UfcLogo,
  OneFcLogo,
} from "@/components/org-logos";

export type RoleMode = "fighter" | "coach" | "athlete";

export type PassportStats = {
  name: string;
  nickname?: string;
  tags: string[];
  combatScore: number;
  level: number;
  maxLevel: number;
  proRecord: string;
  elo: number;
  weightKg: number;
  streakDays: number;
  koRatioPct: number;
  isWinner: boolean;
};

export type PassportEcon = {
  netPct: number;
  totalIncomeRub: number;
  totalSessions: number;
  hasVideo: boolean;
  iphoneTickets: number;
  dailyStreakDays: number;
  insuranceActive: boolean;
  balanceRub: number;
  xpInto: number;
  xpForNext: number | null;
  xpPct: number;
};

const ROLE_ACCENT: Record<RoleMode, string> = {
  fighter: "#e879f9", // pink/magenta neon
  coach: "#facc15", // gold
  athlete: "#00F0FF", // cyan
};

type LeagueCard = {
  id: string;
  Logo: (p: { size?: number; color?: string; active?: boolean }) => React.ReactNode;
  color: string;
  status: string;
  highlight?: boolean;
};

const LEAGUES: LeagueCard[] = [
  { id: "aca", Logo: AcaLogo, color: "#facc15", status: "ABSOLUTE" },
  { id: "rcc", Logo: RccLogo, color: "#f87171", status: "INTERMIX", highlight: true },
  { id: "fng", Logo: FngLogo, color: "#34d399", status: "FIGHT NIGHTS" },
  { id: "ufc", Logo: UfcLogo, color: "#ef4444", status: "SCOUTED" },
  { id: "one", Logo: OneFcLogo, color: "#dc2626", status: "OPEN" },
];

const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

// ── Square stat tile ───────────────────────────────────────────────────────

type Tile = {
  label: string;
  value: string;
  unit?: string;
  accent: string;
  valueColor?: string;
  footer?: React.ReactNode;
};

function StatTile({
  label,
  value,
  unit,
  accent,
  valueColor,
  footer,
}: Tile & { footer?: React.ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900/70 p-4"
    >
      <span
        className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full"
        style={{ background: accent, boxShadow: `0 0 7px 1px ${accent}` }}
      />
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span
          className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-bold leading-none tracking-tight text-white"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </span>
        {unit ? (
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.14em] text-neutral-500">
            {unit}
          </span>
        ) : null}
      </p>
      {footer}
    </motion.div>
  );
}

// ── Octagon centre per role ─────────────────────────────────────────────────

function CoachCentre({ onCreateSplit }: { onCreateSplit?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-[family-name:var(--font-geist-mono)] text-[8px] font-semibold uppercase tracking-[0.4em] text-amber-300">
        Coach Ops
      </span>
      <motion.button
        type="button"
        onClick={onCreateSplit}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.04 }}
        className="rounded-2xl border border-amber-400/70 bg-gradient-to-b from-amber-300/25 to-amber-500/10 px-4 py-3 font-[family-name:var(--font-jetbrains-mono)] text-[12px] font-extrabold uppercase leading-tight tracking-[0.12em] text-amber-100"
        style={{ boxShadow: "0 0 26px -4px rgba(250,204,21,0.7), inset 0 0 16px -8px rgba(250,204,21,0.9)" }}
      >
        Создать
        <br />
        Сплит
      </motion.button>
    </div>
  );
}

function AthleteCentre({
  level,
  xpInto,
  xpForNext,
  xpPct,
}: {
  level: number;
  xpInto: number;
  xpForNext: number | null;
  xpPct: number;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <span className="font-[family-name:var(--font-geist-mono)] text-[8px] font-semibold uppercase tracking-[0.4em] text-cyan-300">
        Your Level
      </span>
      <span
        className="font-[family-name:var(--font-jetbrains-mono)] text-[clamp(2rem,9vw,3rem)] font-extrabold leading-none tracking-tight text-white"
        style={{ textShadow: "0 0 24px rgba(0,240,255,0.6)" }}
      >
        LVL {level}
      </span>
      <div className="mt-0.5 h-1.5 w-[68%] overflow-hidden rounded-full border border-cyan-400/30 bg-black/60">
        <motion.div
          className="h-full rounded-full bg-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(xpPct * 100)}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          style={{ boxShadow: "0 0 10px #00F0FF" }}
        />
      </div>
      <span className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.18em] text-zinc-500">
        XP {xpInto}
        {xpForNext != null ? ` · до lvl ${xpForNext}` : " · MAX"}
      </span>
    </div>
  );
}

// ── Tile sets per role ──────────────────────────────────────────────────────

function tilesFor(role: RoleMode, stats: PassportStats, econ: PassportEcon, accent: string): Tile[] {
  if (role === "coach") {
    return [
      { label: "Баланс Нетто", value: `${econ.netPct}%`, accent },
      { label: "Общий доход", value: fmtRub.format(econ.totalIncomeRub), accent },
      { label: "Всего сессий", value: String(econ.totalSessions), accent },
      { label: "Видео-визитка", value: econ.hasVideo ? "АКТИВНА" : "НЕТ", accent },
    ];
  }
  if (role === "athlete") {
    return [
      { label: "Билеты iPhone", value: String(econ.iphoneTickets), unit: "🎟", accent },
      { label: "Daily Streak", value: String(econ.dailyStreakDays), unit: "дн", accent },
      {
        label: "Страховка",
        value: econ.insuranceActive ? "АКТИВНА" : "—",
        accent: "#34d399",
        valueColor: econ.insuranceActive ? "#34d399" : undefined,
      },
      { label: "Мой Баланс", value: fmtRub.format(econ.balanceRub), accent },
    ];
  }
  // fighter
  return [
    { label: "Рекорд", value: stats.proRecord, accent },
    { label: "Global ELO", value: String(stats.elo), accent },
    { label: "Вес", value: stats.weightKg.toFixed(1), unit: "kg", accent },
    { label: "Стрик", value: String(stats.streakDays), unit: "дн", accent },
  ];
}

// ── View ────────────────────────────────────────────────────────────────────

export function PassportView({
  role,
  stats,
  econ,
  fighterId,
  onCreateSplit,
}: {
  role: RoleMode;
  stats: PassportStats;
  econ: PassportEcon;
  fighterId?: string;
  onCreateSplit?: () => void;
}) {
  const accent = ROLE_ACCENT[role];
  const [first, ...rest] = stats.name.split(" ");
  const surname = rest.join(" ");

  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [sherdogStatus, setSherdogStatus] = useState<SherdogSyncStatus>("idle");
  const [liveRecord, setLiveRecord] = useState(stats.proRecord);
  const [liveElo, setLiveElo] = useState(stats.elo);

  const runSherdogSync = useCallback(async () => {
    const client = createWarriorBrowserClient();
    if (!client || !fighterId) return;
    setSherdogStatus("syncing");
    const result = await syncWithSherdog(client, fighterId);
    if (result.status === "ok") {
      setLiveRecord(result.proRecord);
      setLiveElo(result.elo);
      setSherdogStatus("ok");
    } else {
      setSherdogStatus("error");
    }
  }, [fighterId]);

  useEffect(() => {
    if (role === "fighter" && fighterId) void runSherdogSync();
  }, [fighterId, role, runSherdogSync]);

  useEffect(() => {
    setLiveRecord(stats.proRecord);
    setLiveElo(stats.elo);
  }, [stats.proRecord, stats.elo]);

  const fighterStats = {
    ...stats,
    proRecord: liveRecord,
    elo: liveElo,
  };

  const recordFooter =
    role === "fighter" && sherdogStatus === "ok" ? (
      <span className="mt-1 block font-[family-name:var(--font-jetbrains-mono)] text-[7px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
        SHERDOG SYNC: OK
      </span>
    ) : sherdogStatus === "syncing" ? (
      <span className="mt-1 block font-[family-name:var(--font-jetbrains-mono)] text-[7px] uppercase tracking-[0.14em] text-neutral-600">
        SHERDOG SYNC…
      </span>
    ) : null;

  const center =
    role === "coach" ? (
      <CoachCentre onCreateSplit={onCreateSplit} />
    ) : role === "athlete" ? (
      <AthleteCentre
        level={stats.level}
        xpInto={econ.xpInto}
        xpForNext={econ.xpForNext}
        xpPct={econ.xpPct}
      />
    ) : undefined;

  const tiles = tilesFor(role, fighterStats, econ, accent).map((t) =>
    t.label === "Рекорд" ? { ...t, value: liveRecord, footer: recordFooter } : t,
  );
  const glow = stats.isWinner && role === "fighter" ? "#facc15" : accent;

  return (
    <div className="flex h-full min-h-0 flex-col px-5 pt-6">
      {/* ── NAME + TAGS (clean sans, tags gray below) ───────────────────── */}
      <div className="shrink-0 text-center">
        <h1 className="font-[family-name:var(--font-geist-sans)] text-[clamp(1.5rem,6.5vw,2rem)] font-semibold leading-tight tracking-tight text-white">
          {stats.nickname ? (
            <>
              {first} <span style={{ color: accent }}>&laquo;{stats.nickname}&raquo;</span>
              {surname ? <> {surname}</> : null}
            </>
          ) : (
            stats.name
          )}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
          {stats.tags.join("  ·  ")}
        </p>
      </div>

      {/* ── FREE-FLOATING SYMMETRIC OCTAGON (breathing room) ────────────── */}
      <div className="flex min-h-0 flex-1 items-center justify-center py-2">
        <div style={{ filter: `drop-shadow(0 0 12px ${glow}55)` }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.22, type: "spring", stiffness: 240, damping: 22 }}
            >
              <CombatOctagon
                score={stats.combatScore}
                level={stats.level}
                maxLevel={stats.maxLevel}
                accent={accent}
                isWinner={stats.isWinner && role === "fighter"}
                widthClass="w-48 sm:w-56"
                center={center}
                showPlaylist={role === "fighter" && !center}
                metatronRole={role as MetatronRole}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── STAT TILES (compact 2×2) ────────────────────────────────────── */}
      <AnimatePresence mode="popLayout">
        <motion.div key={role} layout className="grid shrink-0 grid-cols-2 gap-3">
          {tiles.map((t) => (
            <StatTile key={`${role}-${t.label}`} {...t} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* ── FightsList expansion (Lotus principle) ──────────────────────── */}
      <AnimatePresence>
        {activeLeague ? (
          <motion.div
            key={activeLeague}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-black/50 px-3 py-2"
          >
            <p className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[8px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              Fights · {activeLeague.toUpperCase()}
            </p>
            <FightsList
              fights={fightsForLeague(activeLeague)}
              accent={LEAGUES.find((l) => l.id === activeLeague)?.color ?? accent}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── LEAGUE CONTRACT CARDS (Lovable-style · Lotus) ──────────────── */}
      <div className="mb-3 mt-4">
        <p className="mb-2 text-center font-[family-name:var(--font-jetbrains-mono)] text-[7.5px] font-semibold uppercase tracking-[0.4em] text-neutral-600">
          Contracts
        </p>
        <div className="grid grid-cols-5 gap-2">
          {LEAGUES.map(({ id, Logo, color, status, highlight }) => {
            const org = findOrg(id);
            const record = getDemoFighterOrgRecord(id);
            const petals = org ? buildOrgPetals(org, record) : [];
            const isActive = activeLeague === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveLeague(isActive ? null : id)}
                className="relative flex flex-col items-center gap-1.5 rounded-xl border border-neutral-800 bg-zinc-900/40 px-1 py-2.5 transition-colors hover:border-white/20"
                style={
                  isActive || highlight
                    ? {
                        borderColor: `${isActive ? color : accent}80`,
                        boxShadow: `0 0 14px -6px ${isActive ? color : accent}`,
                      }
                    : undefined
                }
              >
                <LotusIcon
                  name={org?.shortName ?? id.toUpperCase()}
                  accent={color}
                  size={28}
                  radius={52}
                  angleOffset={180}
                  petals={petals}
                  closeOnOutside={false}
                >
                  <Logo size={22} color={color} active={isActive} />
                </LotusIcon>
                <span className="w-full text-center font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase leading-[1.1] tracking-wider text-neutral-500">
                  {status}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
