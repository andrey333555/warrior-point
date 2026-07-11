"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDonateUi } from "@/hooks/use-donate-ui";
import {
  advanceFighterXp,
  DEMO_SESSION_GROSS_RUB,
  deriveLevel,
  MAX_LEVEL,
  PLATFORM_COMMISSION_PCT,
  recordTrainingSessionRub,
  xpBracketProgress,
  type FighterAdvancerResult,
  type SettlementBreakdown,
  type TrainingSessionEconomyResult,
} from "@/lib/economy";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { persistWarriorTrainingSession } from "@/lib/supabase/warrior-sync";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { fetchFighterHydration, fetchWarriorProfile } from "@/lib/supabase/read";
import { isWarriorAdminMode, WARRIOR_WINNER_STATUS } from "@/lib/admin";
import {
  ROLE_LABELS,
  canManageWinners,
  type WarriorRole,
} from "@/lib/roles";
import { AgentsWindow } from "@/components/agents-window";
import { SplitsBoard } from "@/components/splits-board";
import {
  DEMO_FIGHTER_DB_ID,
  DEMO_FIGHTER_DISPLAY_ID,
  DEMO_FIGHTER_DISPLAY_NAME,
  DEMO_FIGHTER_INITIALS,
  DEMO_FIGHTER_CLUB,
  DEMO_FIGHTER_PROMOTIONS,
  DEMO_FIGHTER_WEIGHT_CLASS,
  DEMO_COMBAT_SCORE,
} from "@/lib/warrior-constants";
import {
  deriveInitials,
  deriveWarriorDisplayId,
} from "@/lib/supabase/provision-user";
import { OctagonWidget } from "@/components/octagon-widget";
import { DailyStreak } from "@/components/daily-streak";
import { CyberStatTile } from "@/components/cyber-stat-tile";
import { CyberTabs, type CyberTabDef } from "@/components/cyber-tabs";
import { EloBar } from "@/components/elo-bar";
import { HexAvatar } from "@/components/hex-avatar";
import { HexBadge } from "@/components/hex-badge";
import { HexCluster, type SotkaSlot } from "@/components/hex-cluster";
import { HexPopover } from "@/components/hex-popover";
import { XpBar } from "@/components/xp-bar";
import { RoundProgress, RoundBadge } from "@/components/RoundProgress";
import {
  RECENT_FIGHTS_MOCK,
  mockRecordSummary,
} from "@/lib/mocks/recent-fights";
import { fightsForLeague } from "@/lib/mocks/league-fights";
import { FightsList } from "@/components/fights-list";
import {
  AcaLogo,
  RccLogo,
  FngLogo,
  UfcLogo,
} from "@/components/org-logos";
import { buildOrgPetals, findOrg, getDemoFighterOrgRecord } from "@/data/organisations";
import { syncWithSherdog, type SherdogSyncStatus } from "@/lib/sherdog-sync";
import { rankRewardFor } from "@/lib/rank-rewards";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import {
  DonateModal,
  type DonatePaymentHandler,
} from "@/components/donate-modal";
import {
  fetchFundraiserProgress,
  type FundraiserProgress,
} from "@/lib/supabase/donations";
import { submitFighterDonation } from "@/lib/donations-flow";

const LEAGUE_CARDS = [
  { id: "aca", Logo: AcaLogo, color: "#facc15", label: "ACA" },
  { id: "rcc", Logo: RccLogo, color: "#f87171", label: "RCC" },
  { id: "fng", Logo: FngLogo, color: "#34d399", label: "FN" },
  { id: "ufc", Logo: UfcLogo, color: "#ef4444", label: "UFC" },
] as const;

const SHOWCASE = {
  elo: 1642,
  eloDelta30d: 12,
  globalPct: 8.4,
};

type LevelBurst = Pick<FighterAdvancerResult, "levelAfter" | "levelsJumped">;

type TabId = "overview" | "ledger" | "vitals" | "splits";

const TABS: ReadonlyArray<CyberTabDef<TabId>> = [
  { id: "overview", label: "Обзор" },
  { id: "ledger", label: "Леджер" },
  { id: "vitals", label: "Витальные" },
  { id: "splits", label: "Сплиты" },
];

export function WarriorPassport({ fighterId }: { fighterId: string }) {
  const router = useRouter();
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const { setDonateOpen } = useDonateUi();
  const [trainingMenuOpen, setTrainingMenuOpen] = useState(false);
  const [donateBusy, setDonateBusy] = useState(false);
  const [donateError, setDonateError] = useState<string | null>(null);
  const [donorBalance, setDonorBalance] = useState(15_000);
  const [fundraiser, setFundraiser] = useState<FundraiserProgress>({
    title: "На сборы в Дагестан",
    goalRub: 50_000,
    raisedRub: 300,
    pct: 1,
  });

  const auth = useWarriorAuth();
  const viewerId =
    auth.status === "authenticated" ? auth.user.id : undefined;

  const totalXpRef = useRef(0);

  const [totalXp, setTotalXp] = useState(0);

  const [careerGrossRub, setCareerGrossRub] = useState(0);
  const [careerCommissionRub, setCareerCommissionRub] = useState(0);
  const [careerNetRub, setCareerNetRub] = useState(0);

  const [sessionsRecorded, setSessionsRecorded] = useState(0);

  const [xp30d, setXp30d] = useState(0);
  const [monthlyXp, setMonthlyXp] = useState(0);
  const monthlyXpRef = useRef(0);

  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [monthlyWinnerAt, setMonthlyWinnerAt] = useState<string | null>(null);
  const [role, setRole] = useState<WarriorRole>("fighter");
  const [adminMode, setAdminMode] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);

  // ── Dynamic profile identity ─────────────────────────────────────────────
  // Demo profile data is the fallback for the showcase fighter ID; every other user
  // gets their own name/initials/ID derived from the database profile.
  const isDemo = fighterId === DEMO_FIGHTER_DB_ID;
  const [profileDisplayName, setProfileDisplayName] = useState<string>(
    isDemo ? DEMO_FIGHTER_DISPLAY_NAME : "Воин",
  );
  const [profileInitials, setProfileInitials] = useState<string>(
    isDemo ? DEMO_FIGHTER_INITIALS : deriveInitials(fighterId),
  );
  const [profileDisplayId, setProfileDisplayId] = useState<string>(
    isDemo ? DEMO_FIGHTER_DISPLAY_ID : deriveWarriorDisplayId(fighterId),
  );

  // Offline-first sync: auto-flushes queued sessions when network returns
  const offlineSync = useOfflineSync(createWarriorBrowserClient());

  const [remoteBootstrapped, setRemoteBootstrapped] = useState(false);

  const [lastSession, setLastSession] = useState<
    TrainingSessionEconomyResult | null
  >(null);

  const [levelBurst, setLevelBurst] = useState<LevelBurst | null>(null);

  const [ledgerEcho, setLedgerEcho] = useState<
    | { tone: "ok"; message: string }
    | { tone: "err"; message: string }
    | null
  >(null);

  const [sessionSyncBusy, setSessionSyncBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [hexOpen, setHexOpen] = useState<"record" | "level" | null>(null);

  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [sherdogStatus, setSherdogStatus] = useState<SherdogSyncStatus>("idle");
  const [proRecordStr, setProRecordStr] = useState<string | null>(null);
  const [liveElo, setLiveElo] = useState(SHOWCASE.elo);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bracket = xpBracketProgress(totalXp);
  const level = deriveLevel(totalXp);

  /**
   * Live W/L: wins follow the audited session count (each RECORD SESSION is a win).
   * Losses come from the mock card until we wire bout outcomes into Supabase.
   */
  const sessionRecord = (() => {
    const seed = mockRecordSummary();
    const losses = seed.losses;
    const wins = Math.max(seed.wins, sessionsRecorded);

    return { wins, losses };
  })();

  const octagonRecord = (() => {
    if (proRecordStr) {
      const parts = proRecordStr.split("-").map((n) => Number(n) || 0);
      return { wins: parts[0], losses: parts[1], draws: parts[2] ?? 0 };
    }
    return {
      wins: isDemo ? 26 : sessionRecord.wins,
      losses: isDemo ? 4 : sessionRecord.losses,
      draws: isDemo ? 1 : 0,
    };
  })();

  const rankReward = rankRewardFor(level);

  const isWinner = currentStatus === WARRIOR_WINNER_STATUS;
  // Admin gate: true when role is 'admin' OR URL carries ?admin=1
  const isAdminGated = canManageWinners(role) || adminMode;

  const fmt = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });

  useEffect(() => {
    totalXpRef.current = totalXp;
  }, [totalXp]);

  useEffect(() => {
    setAdminMode(isWarriorAdminMode());
  }, []);

  useEffect(() => {
    setDonateOpen(isDonateModalOpen);
    return () => setDonateOpen(false);
  }, [isDonateModalOpen, setDonateOpen]);

  useEffect(() => {
    if (!remoteBootstrapped) return;
    const client = createWarriorBrowserClient();
    if (!client) return;
    void fetchFundraiserProgress(client, fighterId).then(setFundraiser);
    if (!viewerId) return;
    void client
      .from("profiles")
      .select("balance")
      .eq("id", viewerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && "balance" in data) {
          setDonorBalance(Number(data.balance) || 0);
        }
      });
  }, [fighterId, remoteBootstrapped, viewerId]);

  const submitDonate = useCallback(
    async (amount: number, comment: string) => {
      setDonateBusy(true);
      setDonateError(null);
      const result = await submitFighterDonation({
        recipientId: fighterId,
        grossRub: amount,
        comment,
        viewerId,
      });
      setDonateBusy(false);
      if (!result.ok) {
        setDonateError(result.message);
        return null;
      }
      setDonorBalance(result.newDonorBalance);
      setFundraiser(result.fundraiser);
      setLedgerEcho({
        tone: "ok",
        message: `Донат ${amount.toLocaleString("ru-RU")} ₽ · бойцу +${result.netRub.toLocaleString("ru-RU")} ₽`,
      });
      return {
        grossRub: result.grossRub,
        netRub: result.netRub,
        newDonorBalance: result.newDonorBalance,
        donationId: result.donationId,
        source: result.source,
      };
    },
    [fighterId, viewerId],
  );

  const closeDonateModal = useCallback((): void => {
    setIsDonateModalOpen(false);
    setDonateOpen(false);
    setDonateError(null);
  }, [setDonateOpen]);

  const pickTrainingType = useCallback((label: string): void => {
    setTrainingMenuOpen(false);
    setLedgerEcho({ tone: "ok", message: `${label} · заявка принята` });
  }, []);

  useEffect(() => {
    const client = createWarriorBrowserClient();
    if (!client || !remoteBootstrapped) return;

    void (async () => {
      setSherdogStatus("syncing");
      const result = await syncWithSherdog(client, fighterId);
      if (result.status === "ok") {
        setProRecordStr(result.proRecord);
        setLiveElo(result.elo);
        setSherdogStatus("ok");
      } else {
        setSherdogStatus("error");
      }
    })();
  }, [fighterId, remoteBootstrapped]);

  useEffect(() => {
    let aborted = false;

    (async () => {
      const client = createWarriorBrowserClient();

      if (!client) {
        if (!aborted) setRemoteBootstrapped(true);

        return;
      }

      try {
        // Run ledger hydration and profile fetch in parallel
        const [ledger, profile] = await Promise.all([
          fetchFighterHydration(client, fighterId),
          fetchWarriorProfile(client, fighterId),
        ]);

        if (aborted) return;

        totalXpRef.current = ledger.totalXp;

        setTotalXp(ledger.totalXp);
        setCareerGrossRub(ledger.careerGrossRub);
        setCareerCommissionRub(ledger.careerCommissionRub);
        setCareerNetRub(ledger.careerNetRub);

        setSessionsRecorded(ledger.sessionsCount);
        setXp30d(ledger.xp30d);

        // Sync monthly XP ref + state from remote
        monthlyXpRef.current = ledger.xp30d;
        setMonthlyXp(ledger.xp30d);

        setCurrentStatus(ledger.currentStatus);
        setMonthlyWinnerAt(ledger.monthlyWinnerAt);

        if (profile) {
          setRole(profile.role);
          // Only override identity for non-demo fighters
          if (!isDemo && profile.displayName) {
            setProfileDisplayName(profile.displayName);
            setProfileInitials(deriveInitials(profile.displayName));
          }
        }
      } catch (error) {
        console.error("[Warrior Point] hydration failed:", error);
      } finally {
        if (!aborted) setRemoteBootstrapped(true);
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  const recordSession = useCallback(async () => {
    const economics = recordTrainingSessionRub(DEMO_SESSION_GROSS_RUB);
    const advancement = advanceFighterXp(totalXpRef.current, economics.xpAward);

    totalXpRef.current = advancement.totalXpAfter;
    setTotalXp(advancement.totalXpAfter);

    setCareerGrossRub((g) => g + economics.breakdown.gross);
    setCareerCommissionRub((c) => c + economics.breakdown.commission);
    setCareerNetRub((n) => n + economics.breakdown.net);
    setSessionsRecorded((s) => s + 1);
    setXp30d((x) => x + economics.xpAward);

    monthlyXpRef.current = monthlyXpRef.current + economics.xpAward;
    setMonthlyXp(monthlyXpRef.current);

    setLastSession(economics);

    if (advancement.levelsJumped > 0) {
      setLevelBurst({
        levelAfter: advancement.levelAfter,
        levelsJumped: advancement.levelsJumped,
      });
    }

    setSessionSyncBusy(true);
    try {
      const client = createWarriorBrowserClient();

      if (!client) {
        console.warn(
          "Warrior Point: define NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
        );

        setLedgerEcho({
          tone: "err",
          message:
            "Supabase env vars missing · add NEXT_PUBLIC_* keys to `.env.local`",
        });

        return;
      }

      const result = await persistWarriorTrainingSession(client, {
        fighterId,
        economics,
        advancement,
        monthlyXpAfter: monthlyXpRef.current,
      });

      if (result.status === "error") {
        console.error("[Warrior Point] persist error:", result.error);
        setLedgerEcho({ tone: "err", message: result.error.message });
        return;
      }

      if (result.status === "saved_offline") {
        console.info(`[Warrior Point] saved offline (${result.pendingCount} pending)`);
        setLedgerEcho({
          tone: "ok",
          message: `Сохранено офлайн · ${result.pendingCount} в очереди`,
        });
        return;
      }

      console.log("Data synced with Supabase!");
      setLedgerEcho({ tone: "ok", message: "Data synced with Supabase!" });
    } finally {
      setSessionSyncBusy(false);
    }
  }, []);

  /**
   * Called by AgentsWindow whenever an admin flips a fighter's `is_winner`.
   * If it touched the locally-rendered passport (demo fighter), we sync the hero
   * UI immediately so the gold sotka & pill react without a full reload.
   */
  const handleAgentsWinnerChange = useCallback(
    (changedFighterId: string, nextIsWinner: boolean) => {
      if (changedFighterId !== fighterId) return;

      setCurrentStatus(nextIsWinner ? WARRIOR_WINNER_STATUS : null);
      setMonthlyWinnerAt(nextIsWinner ? new Date().toISOString() : null);
      setLedgerEcho({
        tone: "ok",
        message: nextIsWinner
          ? "Winner of the Month · is_winner=true synced"
          : "Winner status revoked · is_winner=false synced",
      });
    },
    [],
  );

  useEffect(() => {
    if (!ledgerEcho || ledgerEcho.tone !== "ok") return undefined;

    const id = window.setTimeout(() => setLedgerEcho(null), 4200);

    return () => window.clearTimeout(id);
  }, [ledgerEcho]);

  useEffect(() => {
    if (!levelBurst) return undefined;

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    dismissTimerRef.current = setTimeout(() => setLevelBurst(null), 2900);

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [levelBurst]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-50">
      {/* Cyber-Loft ambient grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "52px 52px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-cyan-500/[0.07] via-transparent to-fuchsia-500/[0.07]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-5 py-9 pb-28 sm:max-w-3xl sm:px-8 sm:py-14 sm:pb-28">
        {!remoteBootstrapped ? (
          <p className="-mb-3 rounded-lg border border-cyan-500/35 bg-black/65 px-3 py-2 text-center font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200/95">
            Подгружаю суверенный леджер…
          </p>
        ) : null}

        <AnimatePresence mode="sync">
          {levelBurst !== null ? (
            <LevelUpOverlay
              levelAfter={levelBurst.levelAfter}
              levelsJumped={levelBurst.levelsJumped}
              onDismiss={() => setLevelBurst(null)}
            />
          ) : null}
        </AnimatePresence>

        <AgentsWindow
          open={agentsOpen}
          client={createWarriorBrowserClient()}
          onClose={() => setAgentsOpen(false)}
          onWinnerChange={handleAgentsWinnerChange}
        />

        {/* HERO · identity */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-gradient-to-br from-zinc-950/95 via-black/85 to-black/90 p-[1px] shadow-[0_0_120px_-30px_rgba(34,211,238,0.4)]">
          <div className="rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-white/[0.04] via-transparent to-fuchsia-500/[0.05] px-5 py-6 sm:px-8 sm:py-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-cyan-300/95">
              Warrior Passport
            </p>

            <div className="mt-5 flex flex-col items-center gap-6">
              {/* ── Octagon fighter card — 8 faces, stat pods, video centre ── */}
              <OctagonWidget
                initials={profileInitials || "ББ"}
                wins={octagonRecord.wins}
                losses={octagonRecord.losses}
                draws={octagonRecord.draws}
                weightClass={isDemo ? "FW / LW" : "—"}
                level={level}
                elo={liveElo}
                club={isDemo ? "Кузня" : "—"}
                style="MMA"
                proSince={isDemo ? 2013 : undefined}
                promotions={
                  isDemo
                    ? DEMO_FIGHTER_PROMOTIONS.split(" · ")
                    : []
                }
                streak={4}
                isWinner={isWinner}
                combatScore={DEMO_COMBAT_SCORE}
                showPlaylist
                metatronRole={role === "coach" ? "coach" : "fighter"}
                videoSrc={isDemo ? "https://vk.com/video-190459948_456239028" : undefined}
              />

              {/* ── Under-octagon client stack (splits tab logic untouched) ── */}
              <div className="flex w-full max-w-[300px] flex-col gap-2.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTrainingMenuOpen((open) => !open)}
                  className="w-full rounded-2xl border-2 border-cyan-400/70 bg-transparent px-4 py-3.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-200"
                  style={{ boxShadow: "0 0 28px -8px rgba(0,240,255,0.55)" }}
                >
                  Записаться на тренировку
                </motion.button>

                <AnimatePresence>
                  {trainingMenuOpen ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl border border-white/[0.1] bg-black/70"
                    >
                      <button
                        type="button"
                        onClick={() => pickTrainingType("Персональная 1-на-1")}
                        className="block w-full border-b border-white/[0.06] px-4 py-3 text-left font-[family-name:var(--font-geist-sans)] text-[13px] text-white hover:bg-white/[0.04]"
                      >
                        Персональная 1-на-1
                      </button>
                      <button
                        type="button"
                        onClick={() => pickTrainingType("Групповая по расписанию")}
                        className="block w-full px-4 py-3 text-left font-[family-name:var(--font-geist-sans)] text-[13px] text-white hover:bg-white/[0.04]"
                      >
                        Групповая по расписанию
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => {
                    setIsDonateModalOpen(true);
                    setDonateOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/[0.08] px-4 py-3 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-200 transition-colors hover:bg-emerald-500/[0.14]"
                >
                  <SbpMiniGlyph />
                  Поддержать бойца
                  <span className="text-[8px] font-semibold tracking-[0.14em] text-emerald-400/80">
                    через СБП
                  </span>
                </button>
              </div>

              <DonateModal
                open={isDonateModalOpen}
                onClose={closeDonateModal}
                fighterName={profileDisplayName}
                fighterInitials={profileInitials}
                fundraiser={fundraiser}
                donorBalance={donorBalance}
                busy={donateBusy}
                error={donateError}
                onDonate={submitDonate}
              />

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                  Combatant
                </p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-[38px]">
                  {profileDisplayName}
                </h1>
                <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-xs tracking-[0.05em] text-zinc-500 sm:text-sm">
                  ID · {profileDisplayId}
                </p>
                {sherdogStatus === "ok" ? (
                  <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                    SHERDOG SYNC: OK · {proRecordStr ?? octagonRecord.wins + "-" + octagonRecord.losses}
                  </p>
                ) : sherdogStatus === "syncing" ? (
                  <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                    SHERDOG SYNC…
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <RankPill level={level} maxLevel={MAX_LEVEL} />

                  <RolePill role={role} />

                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                    Sanctioned · Worldwide
                  </span>

                  <AnimatePresence initial={false}>
                    {isWinner ? (
                      <motion.span
                        key="winner-pill"
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{
                          type: "spring",
                          stiffness: 360,
                          damping: 24,
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/55 bg-amber-500/[0.1] px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200 shadow-[0_0_22px_-6px_rgba(250,204,21,0.65)]"
                        title={
                          monthlyWinnerAt
                            ? `Granted ${new Date(monthlyWinnerAt).toLocaleDateString()}`
                            : undefined
                        }
                      >
                        <GiftGlyph className="h-3 w-3" />
                        Winner of the Month
                      </motion.span>
                    ) : null}
                  </AnimatePresence>

                  {isAdminGated ? (
                    <AdminAgentsTrigger
                      onClick={() => setAgentsOpen(true)}
                      pulse={isWinner}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {hexOpen === "record" ? (
                <motion.div
                  key="hex-record"
                  layout
                  className="mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <HexPopover
                    id="hex-popover-record"
                    accent="green"
                    eyebrow="Recent bouts · live ledger"
                    title={`Record · ${octagonRecord.wins} − ${octagonRecord.losses}`}
                    onClose={() => setHexOpen(null)}
                  >
                    <ul className="space-y-2.5">
                      {RECENT_FIGHTS_MOCK.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/55 px-3 py-2.5 sm:px-4 sm:py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-[family-name:var(--font-geist-mono)] text-sm font-semibold text-white">
                              {f.opponent}
                              <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                                {f.flag}
                              </span>
                            </p>
                            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              {f.date} · {f.method}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 text-right">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border font-[family-name:var(--font-geist-mono)] text-[11px] font-bold ${
                                f.result === "W"
                                  ? "border-emerald-400/55 bg-emerald-500/[0.15] text-emerald-200"
                                  : f.result === "L"
                                  ? "border-amber-400/55 bg-amber-500/[0.12] text-amber-200"
                                  : "border-white/20 bg-white/[0.05] text-zinc-300"
                              }`}
                            >
                              {f.result}
                            </span>
                            <div className="flex flex-col items-end">
                              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-cyan-200">
                                +{f.xpAwarded} XP
                              </span>
                              <span
                                className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${
                                  f.eloDelta >= 0
                                    ? "text-emerald-300"
                                    : "text-amber-300"
                                }`}
                              >
                                {f.eloDelta >= 0 ? "+" : ""}
                                {f.eloDelta} ELO
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
                      Live W растёт автоматически с каждой записью в{" "}
                      <span className="font-[family-name:var(--font-geist-mono)] text-zinc-300">
                        training_sessions
                      </span>
                      .
                    </p>
                  </HexPopover>
                </motion.div>
              ) : null}

              {hexOpen === "level" ? (
                <motion.div
                  key="hex-level"
                  layout
                  className="mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <HexPopover
                    id="hex-popover-level"
                    accent="pink"
                    eyebrow={`Tier ${level} / ${MAX_LEVEL}`}
                    title={`Rank ${level}: ${rankReward.name}`}
                    onClose={() => setHexOpen(null)}
                  >
                    <p className="font-[family-name:var(--font-geist-mono)] text-sm leading-relaxed text-zinc-200 sm:text-base">
                      {rankReward.perk}
                      {rankReward.xpBonusPct > 0 ? (
                        <span className="ml-2 inline-flex items-center rounded-md border border-fuchsia-400/40 bg-fuchsia-500/[0.12] px-2 py-0.5 font-bold tabular-nums text-fuchsia-200">
                          +{rankReward.xpBonusPct}% XP
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[11px] leading-relaxed text-zinc-500">
                      Бонус действует на следующую RECORD SESSION. Прогресс
                      между гейтами: {Math.round(bracket.pctInLevel * 100)}% ·
                      следующий ранг откроет ещё больше перков.
                    </p>
                  </HexPopover>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="mt-7 space-y-5">
              <RoundBadge xp={totalXp} />
              <RoundProgress xp={totalXp} showSources />
              <XpBar
                level={bracket.level}
                maxLevel={MAX_LEVEL}
                totalXp={totalXp}
                pctInLevel={bracket.pctInLevel}
                xpForNext={bracket.xpForNext}
              />
            </div>

            <div className="mt-6">
              <RecordSessionAction
                onRecord={() => void recordSession()}
                busy={sessionSyncBusy}
                disabled={!remoteBootstrapped}
                fmt={fmt}
                echo={ledgerEcho}
                offlinePending={offlineSync.pendingCount}
                isSyncing={offlineSync.isSyncing}
              />
            </div>
          </div>
        </section>

        {/* ── League contracts + FightsList (Lotus) ─────────────────────── */}
        <section className="rounded-2xl border border-white/[0.06] bg-black/60 px-4 py-4 backdrop-blur-md">
          <p className="mb-3 text-center font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
            Contracts · ACA · RCC · FN · UFC
          </p>
          <div className="grid grid-cols-4 gap-2">
            {LEAGUE_CARDS.map(({ id, Logo, color, label }) => {
              const org = findOrg(id);
              const record = getDemoFighterOrgRecord(id);
              const petals = org ? buildOrgPetals(org, record) : [];
              const isActive = activeLeague === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveLeague(isActive ? null : id)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-zinc-900/50 py-3 transition-colors hover:border-white/20"
                  style={
                    isActive
                      ? { borderColor: `${color}88`, boxShadow: `0 0 18px -6px ${color}` }
                      : undefined
                  }
                >
                  <Logo size={28} color={color} active={isActive} />
                  <span className="font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color }}>
                    {label}
                  </span>
                  {petals.length > 0 ? (
                    <span className="font-[family-name:var(--font-geist-mono)] text-[7px] uppercase tracking-[0.12em] text-zinc-600">
                      {petals[0]?.value}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {activeLeague ? (
              <motion.div
                key={activeLeague}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <FightsList
                  fights={fightsForLeague(activeLeague)}
                  accent={LEAGUE_CARDS.find((c) => c.id === activeLeague)?.color}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>

        {/* ELO */}
        <EloBar
          elo={liveElo}
          delta30d={SHOWCASE.eloDelta30d}
          globalPct={SHOWCASE.globalPct}
        />

        {/* Tabs */}
        <div className="space-y-5">
          <CyberTabs<TabId>
            tabs={TABS}
            active={activeTab}
            onChange={setActiveTab}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              role="tabpanel"
            >
              {activeTab === "overview" ? (
                <OverviewTab
                  sessionsRecorded={sessionsRecorded}
                  careerGrossRub={careerGrossRub}
                  careerCommissionRub={careerCommissionRub}
                  careerNetRub={careerNetRub}
                  monthlyXp={monthlyXp}
                  fmt={fmt}
                  lastSession={lastSession}
                />
              ) : null}

              {activeTab === "ledger" ? (
                <LedgerTab
                  careerGrossRub={careerGrossRub}
                  careerCommissionRub={careerCommissionRub}
                  careerNetRub={careerNetRub}
                  fmt={fmt}
                />
              ) : null}

              {activeTab === "vitals" ? <VitalsTab /> : null}

              {activeTab === "splits" ? (
                <SplitsBoard
                  currentFighterId={fighterId}
                  role={role}
                  adminMode={adminMode}
                  client={createWarriorBrowserClient()}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="pt-4 text-center text-[10px] uppercase tracking-[0.22em] text-zinc-600">
          Warrior Point · Sovereign ledger · Worldwide
        </footer>
      </main>
    </div>
  );
}

/* ───────────────────── sub‑components ───────────────────── */

function SbpMiniGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#1a1a2e" stroke="#5eead4" strokeWidth="1.2" />
      <path d="M6 10 H18 M6 14 H13" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GiftGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3.5" y="9" width="17" height="11" rx="1.3" />
      <path d="M3.5 13.5h17" />
      <path d="M12 9v11" />
      <path d="M12 9c-1.6-2.8-6.2-2.2-6.2 0.6 0 1.6 2.4 1.6 4 1.6h2.2z" />
      <path d="M12 9c1.6-2.8 6.2-2.2 6.2 0.6 0 1.6-2.4 1.6-4 1.6H12z" />
    </svg>
  );
}

function TrophyGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3" />
      <path d="M9 14h6v3H9z" />
      <path d="M8 20h8" />
      <path d="M12 14v3" />
    </svg>
  );
}

/**
 * Opens the Agents Window admin panel. Pulses softly when the current
 * fighter already holds the Winner-of-the-Month status so admins can see
 * state at a glance.
 */
function AdminAgentsTrigger({
  onClick,
  pulse,
}: {
  onClick: () => void;
  pulse: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Open Agents Window (admin)"
      title="Agents Window · admin panel"
      className={
        pulse
          ? "relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/70 bg-amber-500/[0.18] text-amber-200 shadow-[0_0_18px_-4px_rgba(250,204,21,0.7)] transition-colors"
          : "relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/[0.06] text-amber-300 transition-colors hover:border-amber-300 hover:bg-amber-500/[0.13] hover:text-amber-200"
      }
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      animate={
        pulse
          ? {
              boxShadow: [
                "0 0 0px rgba(250,204,21,0)",
                "0 0 22px rgba(250,204,21,0.55)",
                "0 0 0px rgba(250,204,21,0)",
              ],
            }
          : undefined
      }
      transition={
        pulse
          ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
          : { type: "spring", stiffness: 320, damping: 22 }
      }
    >
      <TrophyGlyph className="h-4 w-4" />
      <span className="sr-only">Open Agents Window</span>
    </motion.button>
  );
}

const ROLE_PILL_STYLES: Record<
  WarriorRole,
  { border: string; bg: string; text: string; shadow: string }
> = {
  admin: {
    border: "border-amber-400/55",
    bg: "bg-amber-500/[0.1]",
    text: "text-amber-200",
    shadow: "shadow-[0_0_18px_-6px_rgba(250,204,21,0.55)]",
  },
  coach: {
    border: "border-fuchsia-400/45",
    bg: "bg-fuchsia-500/[0.08]",
    text: "text-fuchsia-200",
    shadow: "",
  },
  fighter: {
    border: "border-cyan-400/35",
    bg: "bg-cyan-500/[0.07]",
    text: "text-cyan-300",
    shadow: "",
  },
};

function RolePill({ role }: { role: WarriorRole }) {
  const s = ROLE_PILL_STYLES[role];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={role}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className={`inline-flex items-center gap-1.5 rounded-full border ${s.border} ${s.bg} ${s.shadow} px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.22em] ${s.text}`}
      >
        {ROLE_LABELS[role]}
      </motion.span>
    </AnimatePresence>
  );
}

function RankPill({ level, maxLevel }: { level: number; maxLevel: number }) {
  const tier = rankRewardFor(level);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={level}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.22em] ${tier.textClass}`}
        style={{
          borderColor: `${tier.color}73`,
          background: `${tier.color}14`,
          boxShadow: `0 0 22px -6px ${tier.color}88`,
        }}
      >
        {tier.name} · {level}
        <span className="text-zinc-500">/{maxLevel}</span>
      </motion.span>
    </AnimatePresence>
  );
}

function RecordSessionAction(props: {
  onRecord: () => void;
  busy: boolean;
  disabled: boolean;
  fmt: Intl.NumberFormat;
  echo:
    | { tone: "ok"; message: string }
    | { tone: "err"; message: string }
    | null;
  offlinePending?: number;
  isSyncing?: boolean;
}) {
  const { onRecord, busy, disabled, fmt, echo, offlinePending = 0, isSyncing = false } = props;

  return (
    <div className="flex flex-col items-center gap-3.5">
      <p className="max-w-md text-center text-[11px] leading-relaxed text-zinc-400 sm:text-xs">
        <span className="mr-2 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300/95">
          Ledger sync
        </span>
        Каждое нажатие — строка в{" "}
        <span className="font-[family-name:var(--font-geist-mono)] text-zinc-200">
          training_sessions
        </span>
        . Платформа удерживает{" "}
        <span className="font-medium text-white">
          {PLATFORM_COMMISSION_PCT}%
        </span>
        , XP начисляется от чистой выплаты.
      </p>

      <div className="flex w-full max-w-sm flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.32em] text-zinc-500">
            Тариф · демо ·{" "}
            <span className="text-zinc-300">
              {fmt.format(DEMO_SESSION_GROSS_RUB)}
            </span>
          </span>
          {/* Offline pending badge */}
          {offlinePending > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[8px] font-semibold uppercase tracking-[0.2em] text-amber-300"
              title={`${offlinePending} сессий ожидают синхронизации`}
            >
              {isSyncing ? "⟳" : "⏱"} {offlinePending}
            </span>
          )}
        </div>

        <motion.button
          type="button"
          onClick={onRecord}
          disabled={busy || disabled}
          aria-busy={busy || disabled}
          className="group relative w-full overflow-hidden rounded-full border border-cyan-400/45 bg-black/70 px-6 py-3 text-center font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100 shadow-[0_0_30px_-10px_rgba(34,211,238,0.55)] backdrop-blur-sm disabled:pointer-events-none disabled:opacity-50 sm:max-w-xs sm:px-7 sm:py-3.5"
          whileTap={{ scale: busy ? 1 : 0.97 }}
          whileHover={{
            scale: 1.012,
            boxShadow:
              "0 0 48px -10px rgba(34,211,238,0.7), inset 0 0 0 1px rgba(244,232,212,0.18)",
            borderColor: "rgba(244,232,212,0.45)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[1px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% -20%, rgba(34,211,238,0.22), transparent 65%)",
            }}
          />
          <span className="pointer-events-none absolute inset-0 translate-y-full bg-gradient-to-t from-cyan-500/[0.18] via-transparent opacity-0 transition duration-500 group-hover:translate-y-1/3 group-hover:opacity-100" />
          <span className="relative">
            {busy ? "СИНХ…" : "ЗАПИСАТЬ СЕССИЮ"}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {echo ? (
          <motion.p
            key={echo.message}
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={
              echo.tone === "ok"
                ? "rounded-full border border-emerald-400/35 bg-emerald-500/[0.1] px-4 py-1.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.24em] text-emerald-200"
                : "rounded-full border border-amber-500/35 bg-amber-500/[0.08] px-4 py-1.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.2em] text-amber-100"
            }
          >
            {echo.message}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function OverviewTab(props: {
  sessionsRecorded: number;
  careerGrossRub: number;
  careerCommissionRub: number;
  careerNetRub: number;
  monthlyXp: number;
  fmt: Intl.NumberFormat;
  lastSession: TrainingSessionEconomyResult | null;
}) {
  const {
    sessionsRecorded,
    careerGrossRub,
    careerCommissionRub,
    careerNetRub,
    monthlyXp,
    fmt,
    lastSession,
  } = props;

  const [focus, setFocus] = useState<
    "sessions" | "earnings" | "coach" | "net" | null
  >(null);

  const FOCUS_NOTES = {
    sessions:
      "Каждое нажатие RECORD SESSION = строка в `training_sessions` (1 000 ₽ gross)",
    earnings: "Сумма `gross_amount` со всех аудированных сессий бойца",
    coach: "19% удержание платформы · кэш тренеру / Warrior Point",
    net: "Чистая выплата бойцу после удержания комиссии 19%",
  } as const;

  return (
    <div className="space-y-4">
      {/* Dopamine Machine — Daily Streak anti-churn widget */}
      <DailyStreak
        streak={4}
        lastSessionAt={new Date(Date.now() - 2 * 24 * 3600 * 1000)}
        firstStrikeEarned={true}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <CyberStatTile
          label="Total Sessions"
          value={sessionsRecorded}
          hint="Audited training count"
          accent="cyan"
          active={focus === "sessions"}
          onActivate={() =>
            setFocus((s) => (s === "sessions" ? null : "sessions"))
          }
          glyph={
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <path d="M2 8h2.5l1.5-4 3 8 1.5-4H14" />
            </svg>
          }
        />

        <CyberStatTile
          label="Career Earnings"
          value={careerGrossRub}
          format={(v) => fmt.format(v)}
          hint="Gross before 19% levy"
          accent="fuchsia"
          active={focus === "earnings"}
          onActivate={() =>
            setFocus((s) => (s === "earnings" ? null : "earnings"))
          }
          glyph={
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <path d="M3 12l4-4 3 3 4-6" />
              <path d="M10 5h4v4" />
            </svg>
          }
        />

        <CyberStatTile
          label="Coach Revenue"
          value={Math.round(careerCommissionRub)}
          format={(v) => fmt.format(v)}
          hint={`${PLATFORM_COMMISSION_PCT}% protocol levy`}
          accent="amber"
          active={focus === "coach"}
          onActivate={() => setFocus((s) => (s === "coach" ? null : "coach"))}
          glyph={
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <circle cx="5" cy="5" r="2" />
              <circle cx="11" cy="11" r="2" />
              <path d="M13 3L3 13" />
            </svg>
          }
        />
      </div>

      {/* Net Balance strip — fintech engine output */}
      <motion.div
        layout
        className="flex items-center justify-between gap-4 rounded-2xl border border-cyan-400/25 bg-black/55 px-5 py-4 sm:px-6"
        style={{ boxShadow: "0 0 30px -14px rgba(34,211,238,0.35)" }}
      >
        <button
          type="button"
          onClick={() => setFocus((s) => (s === "net" ? null : "net"))}
          className="flex min-w-0 flex-col text-left"
        >
          <span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
            Мой баланс · нетто
          </span>
          <span className="mt-1 font-[family-name:var(--font-geist-mono)] text-xl font-bold tabular-nums text-cyan-200 sm:text-2xl">
            {fmt.format(Math.round(careerNetRub))}
          </span>
        </button>
        <div className="text-right">
          <span className="block font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.28em] text-zinc-500">
            XP за 30 дней
          </span>
          <span className="mt-1 block font-[family-name:var(--font-geist-mono)] text-lg font-bold tabular-nums text-fuchsia-200">
            +{monthlyXp}
          </span>
        </div>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {focus !== null ? (
          <motion.p
            key={focus}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-lg border border-white/[0.07] bg-black/55 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] leading-relaxed text-zinc-400 sm:px-4"
          >
            {FOCUS_NOTES[focus]}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {lastSession ? (
        <LastSessionRibbon
          breakdown={lastSession.breakdown}
          xpAward={lastSession.xpAward}
          fmt={fmt}
        />
      ) : null}
    </div>
  );
}

function LedgerTab(props: {
  careerGrossRub: number;
  careerCommissionRub: number;
  careerNetRub: number;
  fmt: Intl.NumberFormat;
}) {
  const { careerGrossRub, careerCommissionRub, careerNetRub, fmt } = props;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-zinc-950/65 p-5 sm:p-7">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
        Суверенные выплаты · RUB
      </h2>
      <ul className="mt-5 space-y-3 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums sm:text-base">
        <li className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
          <span className="text-zinc-400">Брутто</span>
          <span className="text-white">{fmt.format(careerGrossRub)}</span>
        </li>
        <li className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
          <span className="text-zinc-400">
            Комиссия платформы ({PLATFORM_COMMISSION_PCT}%)
          </span>
          <span className="text-amber-200/95">
            −{fmt.format(Math.round(careerCommissionRub))}
          </span>
        </li>
        <li className="flex justify-between gap-4 pt-1">
          <span className="font-medium uppercase tracking-wide text-zinc-300">
            Бойцу на руки
          </span>
          <span className="text-xl font-semibold text-white sm:text-2xl">
            {fmt.format(Math.round(careerNetRub))}
          </span>
        </li>
      </ul>
      <p className="mt-5 text-[11px] leading-relaxed text-zinc-500">
        Цифры отражают удержания Warrior Point · 19% протокольная комиссия с
        каждой санкционированной строки.
      </p>
    </section>
  );
}

function VitalsTab() {
  return (
    <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-black/80 to-black/90 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-400/90">
          Биометрия
        </h2>
        <span className="rounded-full border border-emerald-500/45 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
          Ready for Apple Health
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-400">
        Зашифрованный физиологический резерв для трансграничных санкционных
        проверок.
      </p>
      <dl className="mt-6 grid grid-cols-3 gap-3 text-center sm:gap-4">
        {[
          { label: "HRV", val: "—", hint: "sync standby" },
          { label: "Recovery", val: "—", hint: "sync standby" },
          { label: "Load index", val: "—", hint: "sync standby" },
        ].map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-white/[0.06] bg-black/35 px-2 py-4 sm:py-5"
          >
            <dt className="text-[10px] uppercase tracking-wider text-zinc-500">
              {row.label}
            </dt>
            <dd className="mt-2 font-[family-name:var(--font-geist-mono)] text-lg text-white">
              {row.val}
            </dd>
            <p className="mt-1 text-[10px] text-zinc-600">{row.hint}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LastSessionRibbon(props: {
  breakdown: SettlementBreakdown;
  xpAward: number;
  fmt: Intl.NumberFormat;
}) {
  const { breakdown, xpAward, fmt } = props;

  return (
    <motion.div
      className="rounded-2xl border border-cyan-400/25 bg-black/55 px-4 py-3 sm:px-5 sm:py-4"
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        Последняя санкция
      </p>
      <ul className="mt-2 grid gap-1 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-zinc-300 sm:text-xs">
        <li className="flex justify-between gap-3">
          <span className="text-zinc-500">Брутто</span>
          <span>{fmt.format(breakdown.gross)}</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="text-zinc-500">
            Комиссия {breakdown.commissionPct}%
          </span>
          <span className="text-amber-200/95">
            −{fmt.format(breakdown.commission)}
          </span>
        </li>
        <li className="flex justify-between gap-3 pt-1 text-white">
          <span className="uppercase tracking-wider text-zinc-400">Нетто</span>
          <span>{fmt.format(breakdown.net)}</span>
        </li>
        <li className="flex justify-between gap-3 border-t border-white/[0.06] pt-2 text-cyan-200">
          <span className="text-zinc-500">Зачислено XP</span>
          <span>+{xpAward}</span>
        </li>
      </ul>
    </motion.div>
  );
}

function LevelUpOverlay(props: {
  levelAfter: number;
  levelsJumped: number;
  onDismiss: () => void;
}) {
  const { levelAfter, levelsJumped, onDismiss } = props;

  return (
    <motion.div
      key="level-veil"
      className="fixed inset-0 z-40 flex cursor-pointer items-center justify-center bg-black/85 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onDismiss}
    >
      <motion.div
        className="flex max-w-sm flex-col items-center text-center"
        initial={{ scale: 0.86, rotateX: -6, opacity: 0 }}
        animate={{ scale: 1, rotateX: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0, filter: "blur(14px)" }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
      >
        <motion.p
          className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.52em] text-cyan-300/95"
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.05,
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          Warrior Point
        </motion.p>

        <div className="mt-10 flex flex-col items-center gap-1 sm:gap-2">
          <motion.span
            className="block font-black uppercase tracking-[0.45em] text-white sm:text-xl"
            style={{ fontSize: "clamp(2.15rem,7vw,3.25rem)" }}
            initial={{ y: 18, opacity: 0, skewX: -6 }}
            animate={{ y: 0, opacity: 1, skewX: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 14,
              delay: 0.12,
            }}
          >
            LEVEL
          </motion.span>

          <motion.span
            className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300 bg-clip-text font-black uppercase tracking-[0.28em]"
            style={{
              WebkitBackgroundClip: "text",
              fontSize: "clamp(3.4rem,12vw,5.75rem)",
              WebkitTextFillColor: "transparent",
            }}
            initial={{ scale: 0.5, opacity: 0, filter: "blur(22px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{
              type: "spring",
              stiffness: 410,
              damping: 24,
              delay: 0.22,
            }}
          >
            UP
          </motion.span>

          <motion.p
            className="mt-6 font-[family-name:var(--font-geist-mono)] text-2xl text-zinc-200 sm:text-3xl"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.42,
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Ранг {levelAfter}
            <span className="text-zinc-500"> /23</span>
          </motion.p>

          {levelsJumped > 1 ? (
            <motion.p
              className="mt-2 text-sm uppercase tracking-[0.25em] text-fuchsia-300/95"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              +{levelsJumped} прыжков по тиерам · взрыв удостоверен
            </motion.p>
          ) : (
            <motion.p
              className="mt-2 text-[11px] uppercase tracking-[0.32em] text-zinc-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              Глобальная лестница обновлена
            </motion.p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
