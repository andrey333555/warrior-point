"use client";

/**
 * TacticalOS — monolithic No-Scroll shell for Warrior Point.
 *
 * Locks the whole experience into 100dvh / overflow-hidden and switches
 * instantly between the Passport (Screen 1) and Leaderboard (Screen 2) views
 * via the floating bottom nav. The Map remains a dedicated route.
 *
 * All Supabase connection interfaces are preserved:
 *   - createWarriorBrowserClient()  (memoised browser client)
 *   - fetchFighterHydration()       (live XP ledger)
 *   - fetchWarriorProfile()         (display name / role)
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { fetchFighterHydration, fetchWarriorProfile } from "@/lib/supabase/read";
import {
  deriveLevel,
  xpBracketProgress,
  MAX_LEVEL,
  PLATFORM_COMMISSION_PCT,
} from "@/lib/economy";
import {
  DEMO_FIGHTER_DB_ID,
  DEMO_FIGHTER_DISPLAY_NAME,
} from "@/lib/warrior-constants";
import {
  PassportView,
  type PassportStats,
  type PassportEcon,
} from "@/components/tactical/passport-view";
import { LeaderboardView } from "@/components/tactical/leaderboard-view";

type ViewId = "passport" | "leaderboard";
type Role = "fighter" | "coach" | "athlete";

const ROLES: Role[] = ["fighter", "coach", "athlete"];

const ROLE_ACCENT: Record<Role, string> = {
  fighter: "#e879f9",
  coach: "#facc15",
  athlete: "#00F0FF",
};

// ── Network status hook ────────────────────────────────────────────────────

function useNetworkStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

// ── Combat score model ──────────────────────────────────────────────────────

function combatScore(level: number, elo: number): number {
  const raw = 40 + level * 2 + (elo - 1400) / 25;
  return Math.max(0, Math.min(99.9, Math.round(raw * 10) / 10));
}

// ── Shell ─────────────────────────────────────────────────────────────────

export function TacticalOS({ fighterId }: { fighterId: string }) {
  const [view, setView] = useState<ViewId>("passport");
  const [role, setRole] = useState<Role>("fighter");
  const online = useNetworkStatus();

  const isDemo = fighterId === DEMO_FIGHTER_DB_ID;
  const client = useMemo(() => createWarriorBrowserClient(), []);

  const [displayName, setDisplayName] = useState<string>(
    isDemo ? DEMO_FIGHTER_DISPLAY_NAME : "Воин",
  );
  const [totalXp, setTotalXp] = useState(0);
  const [isWinner, setIsWinner] = useState(false);
  const [careerNetRub, setCareerNetRub] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [echo, setEcho] = useState<string | null>(null);

  // ── Hydrate from Supabase (profiles · fighter_stats · training_sessions) ──
  useEffect(() => {
    if (!client) return;
    let aborted = false;

    (async () => {
      try {
        const [ledger, profile] = await Promise.all([
          fetchFighterHydration(client, fighterId),
          fetchWarriorProfile(client, fighterId),
        ]);
        if (aborted) return;
        setTotalXp(ledger.totalXp);
        setIsWinner(ledger.isWinner);
        setCareerNetRub(ledger.careerNetRub);
        setSessionsCount(ledger.sessionsCount);
        if (profile?.role) {
          setRole(profile.role === "coach" ? "coach" : "fighter");
        }
        if (!isDemo && profile?.displayName) {
          setDisplayName(profile.displayName);
        }
      } catch (err) {
        console.error("[TacticalOS] hydration failed:", err);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [client, fighterId, isDemo]);

  const onCreateSplit = useCallback(() => {
    setEcho("Конструктор сплитов · скоро в COACH OPS");
    window.setTimeout(() => setEcho(null), 2800);
  }, []);

  // ── Derive role-aware passport stats ─────────────────────────────────────
  const realLevel = deriveLevel(totalXp);
  const fighterLevel = isDemo ? (realLevel > 1 ? realLevel : 17) : realLevel;
  const athleteLevel = isDemo ? (realLevel > 1 ? realLevel : 3) : realLevel;
  const netPct = 100 - PLATFORM_COMMISSION_PCT; // 81

  const tags: string[] =
    role === "coach"
      ? ["HEAD COACH", "КУЗНЯ", `${netPct}% НЕТТО`]
      : role === "athlete"
      ? ["MEMBER", "KRASNODAR", `LVL ${athleteLevel}`]
      : isDemo
      ? ["KRD", "KRASNODAR", "LIGHTWEIGHT"]
      : ["WARRIOR POINT", "ROOKIE", "UNRANKED"];

  const stats: PassportStats = {
    name: isDemo ? DEMO_FIGHTER_DISPLAY_NAME : displayName,
    nickname: role === "fighter" && isDemo ? "Cobra" : undefined,
    tags,
    combatScore: isDemo ? 92.4 : combatScore(realLevel, 1400 + Math.round(totalXp / 12)),
    level: role === "athlete" ? athleteLevel : fighterLevel,
    maxLevel: MAX_LEVEL,
    proRecord: isDemo ? "26-4-1" : "0-0-0",
    elo: isDemo ? 1642 : 1400 + Math.round(totalXp / 12),
    weightKg: isDemo ? 70.3 : 70.0,
    streakDays: isDemo ? 28 : 0,
    koRatioPct: isDemo ? 62 : 0,
    isWinner,
  };

  // ── Economy / membership data (training_sessions · fighter_stats) ─────────
  const bracket = xpBracketProgress(totalXp);

  const econ: PassportEcon = isDemo
    ? {
        netPct,
        totalIncomeRub: 486000,
        totalSessions: 312,
        hasVideo: true,
        iphoneTickets: 3,
        dailyStreakDays: 4,
        insuranceActive: true,
        balanceRub: 12400,
        xpInto: 120,
        xpForNext: 280,
        xpPct: 0.46,
      }
    : {
        netPct,
        totalIncomeRub: careerNetRub,
        totalSessions: sessionsCount,
        hasVideo: false,
        iphoneTickets: Math.floor(totalXp / 500),
        dailyStreakDays: 0,
        insuranceActive: true,
        balanceRub: 0,
        xpInto: bracket.xpIntoLevel,
        xpForNext: bracket.xpForNext,
        xpPct: bracket.pctInLevel,
      };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      {/* ── Desktop ambient: deep black + soft blurred cyan/magenta blobs ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div
          className="absolute -left-32 -top-32 h-[42rem] w-[42rem] rounded-full bg-cyan-500/20 blur-[120px]"
        />
        <div
          className="absolute -bottom-40 -right-32 h-[42rem] w-[42rem] rounded-full bg-fuchsia-500/20 blur-[120px]"
        />
        <div
          className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]"
        />
      </div>

      {/* ── Phone frame (max-w-420, centred) ──────────────────────────────── */}
      <div className="relative mx-auto flex h-[100dvh] max-w-[420px] flex-col overflow-hidden border-x border-white/[0.06] bg-[#070710] text-zinc-100 shadow-[0_0_80px_-20px_rgba(0,240,255,0.3)]">
      {/* Ambient cyber-loft grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.6) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,240,255,0.4) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/[0.04] via-transparent to-fuchsia-500/[0.06]" />

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] bg-black/40 px-3 py-2 backdrop-blur-md sm:px-5">
        {/* Logo */}
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-400/50 bg-cyan-500/10"
            style={{ boxShadow: "0 0 12px -3px rgba(0,240,255,0.7)" }}
          >
            <span className="h-2 w-2 rotate-45 bg-cyan-400" style={{ boxShadow: "0 0 6px #00F0FF" }} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em] text-white">
              Warrior Point
            </p>
            <p className="hidden truncate font-[family-name:var(--font-geist-mono)] text-[7.5px] uppercase tracking-[0.3em] text-cyan-400/60 sm:block">
              // Tactical Fighter OS
            </p>
          </div>
        </div>

        {/* Ops data (center) */}
        <div className="hidden items-center gap-2 font-[family-name:var(--font-geist-mono)] text-[8.5px] uppercase tracking-[0.24em] text-zinc-500 md:flex">
          <span>KRASNODAR</span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: online ? "#34d399" : "#ef4444",
                boxShadow: `0 0 6px ${online ? "#34d399" : "#ef4444"}`,
              }}
            />
            {online ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        {/* Role switcher */}
        <div className="flex shrink-0 rounded-full border border-white/[0.08] bg-black/50 p-0.5">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={
                role === r
                  ? "rounded-full border border-cyan-400/60 bg-cyan-500/10 px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[7.5px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-[0_0_14px_-5px_rgba(0,240,255,0.9)] sm:px-2.5 sm:text-[8px]"
                  : "rounded-full border border-transparent px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[7.5px] font-semibold uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:text-cyan-300 sm:px-2.5 sm:text-[8px]"
              }
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* ── VIEW AREA ───────────────────────────────────────────────────── */}
      <main className="relative z-10 min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="h-full"
          >
            {view === "passport" ? (
              <PassportView
                role={role}
                stats={stats}
                econ={econ}
                fighterId={fighterId}
                onCreateSplit={onCreateSplit}
              />
            ) : (
              <LeaderboardView
                currentUserId={fighterId}
                roleAccent={ROLE_ACCENT[role]}
                weightClass={role === "coach" ? "ALL DIVISIONS" : "LIGHTWEIGHT"}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Transient action echo */}
        <AnimatePresence>
          {echo ? (
            <motion.div
              key={echo}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-400/40 bg-black/85 px-4 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-200 backdrop-blur-md"
              style={{ boxShadow: "0 0 24px -8px rgba(250,204,21,0.7)" }}
            >
              {echo}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* ── FLOATING BOTTOM NAV ─────────────────────────────────────────── */}
      <nav className="relative z-20 flex shrink-0 justify-center px-4 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] pt-1.5">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/70 p-1 backdrop-blur-xl shadow-[0_0_40px_-12px_rgba(0,240,255,0.5)]">
          <NavTab active={view === "passport"} onClick={() => setView("passport")}>
            Passport
          </NavTab>
          <NavTab active={view === "leaderboard"} onClick={() => setView("leaderboard")}>
            Leaderboard
          </NavTab>
          <Link
            href="/map"
            className="rounded-full border border-transparent px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500 transition-colors hover:border-white/[0.08] hover:text-cyan-300"
          >
            Map
          </Link>
        </div>
      </nav>
      </div>
    </div>
  );
}

function NavTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full border border-cyan-400/55 bg-cyan-500/10 px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200 shadow-[0_0_22px_-6px_rgba(0,240,255,0.8)]"
          : "rounded-full border border-transparent px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500 transition-colors hover:border-white/[0.08] hover:text-cyan-300"
      }
    >
      {children}
    </button>
  );
}
