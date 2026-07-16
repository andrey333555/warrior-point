"use client";

/**
 * TacticalOS — monolithic No-Scroll shell for Warrior Point.
 *
 * Vertical stack: Header → Main feed → HubNav (глобально в layout).
 * Разделы: Лента · Паспорт · Топ через ?tab= · Карты на /map.
 *
 * All Supabase connection interfaces are preserved:
 *   - createWarriorBrowserClient()  (memoised browser client)
 *   - fetchFighterHydration()       (live XP ledger)
 *   - fetchWarriorProfile()         (display name / role)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { AnimatePresence, motion } from "framer-motion";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
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
  DEMO_FIGHTER_PORTRAIT,
  DEMO_TRAINING_THUMBNAIL,
} from "@/lib/warrior-constants";
import { DEFAULT_FIGHTER_IMAGE } from "@/lib/network";
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
import {
  buildCalibration,
  formatRecord,
  getSkillTierMeta,
} from "@/lib/calibration";
import {
  getCalibration,
  saveCalibration,
} from "@/lib/calibration-store";
import type { WarriorCalibration } from "@/lib/calibration";

type Role = "fighter" | "coach" | "athlete";

function parseFeedCategory(tab: string | null): FeedCategory {
  if (tab === "passport" || tab === "leaderboard") return tab;
  return "feed";
}

function combatScore(level: number, elo: number): number {
  const raw = 40 + level * 2 + (elo - 1400) / 25;
  return Math.max(0, Math.min(99.9, Math.round(raw * 10) / 10));
}

// ── Shell ─────────────────────────────────────────────────────────────────

export function TacticalOS({ fighterId }: { fighterId: string }) {
  const auth = useWarriorAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewerId =
    auth.status === "authenticated" ? auth.user.id : undefined;

  const [category, setCategory] = useState<FeedCategory>(() =>
    parseFeedCategory(searchParams.get("tab")),
  );
  const [role, setRole] = useState<Role>("fighter");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  const isDemo = fighterId === DEMO_FIGHTER_DB_ID;
  const client = useMemo(() => createWarriorBrowserClient(), []);
  const offlineSync = useOfflineSync(client, fighterId);

  const [displayName, setDisplayName] = useState<string>(
    isDemo ? DEMO_FIGHTER_DISPLAY_NAME : "Воин",
  );
  const [totalXp, setTotalXp] = useState(0);
  const [isWinner, setIsWinner] = useState(false);
  const [careerNetRub, setCareerNetRub] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [echo, setEcho] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<WarriorCalibration | null>(null);

  useEffect(() => {
    if (isDemo && !getCalibration(fighterId)) {
      saveCalibration(
        fighterId,
        buildCalibration("pro", { wins: 27, losses: 4, draws: 1 }),
      );
    }
    setCalibration(getCalibration(fighterId));
  }, [fighterId, isDemo]);

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

  const onDonateSuccess = useCallback((message: string) => {
    setEcho(message);
    window.setTimeout(() => setEcho(null), 3200);
  }, []);

  useEffect(() => {
    setCategory(parseFeedCategory(searchParams.get("tab")));
  }, [searchParams]);

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
      : calibration
      ? [
          getSkillTierMeta(calibration.skillTier).label.toUpperCase(),
          "WARRIOR POINT",
          `ELO ${calibration.startingElo}`,
        ]
      : isDemo
      ? ["KRD", "KRASNODAR", "LIGHTWEIGHT"]
      : ["WARRIOR POINT", "ROOKIE", "UNRANKED"];

  const stats: PassportStats = {
    name: isDemo ? DEMO_FIGHTER_DISPLAY_NAME : displayName,
    nickname: role === "fighter" && isDemo ? "Jaguar" : undefined,
    tags,
    combatScore: isDemo ? 92.4 : combatScore(realLevel, 1400 + Math.round(totalXp / 12)),
    level: role === "athlete" ? athleteLevel : fighterLevel,
    maxLevel: MAX_LEVEL,
    proRecord: calibration
      ? formatRecord(calibration.record)
      : isDemo
        ? "27-4-1"
        : "0-0-0",
    recordMethods: isDemo ? { ko: 7, dec: 5, sub: 15 } : { ko: 0, dec: 0, sub: 0 },
    elo: calibration?.startingElo ?? (isDemo ? 1642 : 1400 + Math.round(totalXp / 12)),
    weightKg: isDemo ? 70.3 : 70.0,
    heightCm: isDemo ? 178 : 175,
    reachCm: isDemo ? 182 : 178,
    age: isDemo ? 28 : 25,
    streakDays: isDemo ? 28 : 0,
    koRatioPct: isDemo ? 62 : 0,
    isWinner,
    badges:
      role === "fighter" && isDemo
        ? ["🐆 Wrestler", "🥇 МСМК", "🔥 5 win streak"]
        : undefined,
    verifiedFighter: calibration?.verifiedFighter ?? (role === "fighter" && isDemo),
    aiAnalysis:
      role === "fighter" && isDemo
        ? {
            style: "Wrestling · pressure grappler",
            strengths: "takedowns · ground control",
            weakness: "дистанция",
          }
        : undefined,
    portraitSrc: isDemo ? DEMO_FIGHTER_PORTRAIT : DEFAULT_FIGHTER_IMAGE,
    trainingThumbnailSrc: isDemo ? DEMO_TRAINING_THUMBNAIL : DEFAULT_FIGHTER_IMAGE,
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
    <div
      className="relative h-[100dvh] w-full overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* ── Desktop ambient: soft blobs (dimmed on light themes via CSS) ── */}
      <div aria-hidden className="wp-theme-ambience pointer-events-none fixed inset-0">
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
      <div
        className="relative mx-auto flex h-[100dvh] max-w-[420px] flex-col overflow-hidden border-x shadow-[0_0_80px_-20px_rgba(0,240,255,0.3)]"
        style={{
          background: "var(--background)",
          color: "var(--foreground)",
          borderColor: "var(--wp-border)",
        }}
      >
      {/* Ambient cyber-loft grid */}
      <div
        aria-hidden
        className="wp-theme-ambience pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.6) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,240,255,0.4) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="wp-theme-ambience pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/[0.04] via-transparent to-fuchsia-500/[0.06]" />

      <FeedLayout
        category={category}
        profileInitials={deriveInitials(stats.name)}
        onSearch={setSearchQuery}
        onProfileClick={() => router.push("/profile")}
        activeVideo={activeVideo}
        onCloseVideo={() => setActiveVideo(null)}
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
                viewerId={viewerId}
                totalXp={totalXp}
                onCreateSplit={onCreateSplit}
                onPlayVideo={setActiveVideo}
                onDonateSuccess={onDonateSuccess}
              />
            ) : (
              <Leaderboard />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {offlineSync.pendingCount > 0 ? (
            <motion.div
              key="offline-pending"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-none sticky bottom-2 z-30 mx-auto mt-3 w-fit whitespace-nowrap rounded-full border border-cyan-400/35 bg-black/85 px-4 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md"
            >
              {offlineSync.isSyncing ? "⟳" : "⏱"} {offlineSync.pendingCount} · ожидает синхронизации
            </motion.div>
          ) : null}
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
