"use client";

/**
 * TacticalOS — monolithic No-Scroll shell for Warrior Point.
 *
 * Vertical stack: Header (logo · search · avatar) → Category tabs → Main feed → Floating player.
 * Categories: Лента (cards) · Паспорт · Топ. Map remains a dedicated route.
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
import Leaderboard from "@/components/leaderboard";
import { FeedLayout } from "@/components/feed/FeedLayout";
import { FeedStream } from "@/components/feed/FeedStream";
import type { FeedCategory } from "@/components/feed/types";
import type { Video } from "@/lib/data";
import { deriveInitials } from "@/lib/supabase/provision-user";

type Role = "fighter" | "coach" | "athlete";

const ROLE_ACCENT: Record<Role, string> = {
  fighter: "#e879f9",
  coach: "#facc15",
  athlete: "#00F0FF",
};

// ── Combat score model ──────────────────────────────────────────────────────

function combatScore(level: number, elo: number): number {
  const raw = 40 + level * 2 + (elo - 1400) / 25;
  return Math.max(0, Math.min(99.9, Math.round(raw * 10) / 10));
}

// ── Shell ─────────────────────────────────────────────────────────────────

export function TacticalOS({ fighterId }: { fighterId: string }) {
  const [category, setCategory] = useState<FeedCategory>("feed");
  const [role, setRole] = useState<Role>("fighter");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

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

  const onApplyTraining = useCallback(() => {
    setEcho("Заявка на персональные тренировки · скоро");
    window.setTimeout(() => setEcho(null), 2800);
  }, []);

  useEffect(() => {
    if (category !== "feed") {
      setActiveVideo(null);
      setSearchQuery("");
    }
  }, [category]);

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
    proRecord: isDemo ? "27-4-1" : "0-0-0",
    recordMethods: isDemo ? { ko: 21, dec: 4, sub: 2 } : { ko: 0, dec: 0, sub: 0 },
    elo: isDemo ? 1642 : 1400 + Math.round(totalXp / 12),
    weightKg: isDemo ? 70.3 : 70.0,
    heightCm: isDemo ? 178 : 175,
    reachCm: isDemo ? 182 : 178,
    age: isDemo ? 28 : 25,
    streakDays: isDemo ? 28 : 0,
    koRatioPct: isDemo ? 62 : 0,
    isWinner,
    badges:
      role === "fighter" && isDemo
        ? ["🏆 ACA Champ", "🥇 МСМК", "🔥 5 win streak"]
        : undefined,
    aiAnalysis:
      role === "fighter" && isDemo
        ? "Cobra — агрессивный striker с высоким finishing rate..."
        : undefined,
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

      <FeedLayout
        category={category}
        onCategoryChange={setCategory}
        roleAccent={ROLE_ACCENT[role]}
        profileInitials={deriveInitials(stats.name)}
        onSearch={setSearchQuery}
        onProfileClick={() => setCategory("passport")}
        activeVideo={activeVideo}
        onCloseVideo={() => setActiveVideo(null)}
        bottomNav={
          <nav className="relative z-20 flex shrink-0 justify-center px-4 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] pt-1.5">
            <Link
              href="/map"
              className="rounded-full border border-white/[0.08] bg-black/70 px-5 py-2 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500 backdrop-blur-xl transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
              style={{ boxShadow: "0 0 40px -12px rgba(0,240,255,0.5)" }}
            >
              Map
            </Link>
          </nav>
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {category === "feed" ? (
              <FeedStream searchQuery={searchQuery} onPlay={setActiveVideo} />
            ) : category === "passport" ? (
              <PassportView
                role={role}
                stats={stats}
                econ={econ}
                fighterId={fighterId}
                totalXp={totalXp}
                onCreateSplit={onCreateSplit}
                onPlayVideo={setActiveVideo}
                onApplyTraining={onApplyTraining}
              />
            ) : (
              <Leaderboard />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {echo ? (
            <motion.div
              key={echo}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="pointer-events-none sticky bottom-2 z-30 mx-auto mt-4 w-fit whitespace-nowrap rounded-full border border-amber-400/40 bg-black/85 px-4 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-200 backdrop-blur-md"
              style={{ boxShadow: "0 0 24px -8px rgba(250,204,21,0.7)" }}
            >
              {echo}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </FeedLayout>
      </div>
    </div>
  );
}
