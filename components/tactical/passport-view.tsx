"use client";

/**
 * PassportView — Tactical Fighter OS · Screen 1.
 *
 * Vertical hierarchy:
 *   Top → Hero → Record → Stats → AI Analysis → Contracts → Training → Video
 *
 * Three role modes: FIGHTER · COACH · ATHLETE
 */

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDonateUi } from "@/hooks/use-donate-ui";
import { RoundMini } from "@/components/RoundProgress";
import { FightsList } from "@/components/fights-list";
import {
  fightsForLeague,
  getLatestFight,
  type LeagueFight,
} from "@/lib/mocks/league-fights";
import { findOrg } from "@/data/organisations";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { syncWithSherdog, type SherdogSyncStatus } from "@/lib/sherdog-sync";
import {
  fetchFundraiserProgress,
  type FundraiserProgress,
} from "@/lib/supabase/donations";
import { submitFighterDonation } from "@/lib/donations-flow";
import { localFundraiserProgress } from "@/lib/donations-store";
import { deriveInitials } from "@/lib/supabase/provision-user";
import { DEMO_FIGHTER_INITIALS, DEMO_FIGHTER_PORTRAIT } from "@/lib/warrior-constants";
import { DEFAULT_FIGHTER_IMAGE } from "@/lib/network";
import {
  DonateModal,
  SupportFighterButton,
  type DonatePaymentHandler,
} from "@/components/donate-modal";
import { PassportHero } from "@/components/tactical/fighter-hero-banner";
import type { Video } from "@/lib/data";

export type RoleMode = "fighter" | "coach" | "athlete";

export type PassportStats = {
  name: string;
  nickname?: string;
  tags: string[];
  combatScore: number;
  level: number;
  maxLevel: number;
  proRecord: string;
  recordMethods?: { ko: number; dec: number; sub: number };
  elo: number;
  weightKg: number;
  heightCm?: number;
  reachCm?: number;
  age?: number;
  streakDays: number;
  koRatioPct: number;
  isWinner: boolean;
  badges?: string[];
  aiAnalysis?: string;
  portraitSrc?: string;
  trainingThumbnailSrc?: string;
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
  fighter: "#e879f9",
  coach: "#facc15",
  athlete: "#00F0FF",
};

const CONTRACTS = [
  { id: "aca", label: "ACA", color: "#facc15" },
  { id: "rcc", label: "RCC", color: "#f87171" },
  { id: "fng", label: "FN", color: "#34d399" },
  { id: "ufc", label: "UFC", color: "#ef4444" },
] as const;

const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const PORTRAIT_FALLBACK = DEMO_FIGHTER_PORTRAIT;
const THUMB_FALLBACK = DEFAULT_FIGHTER_IMAGE;

function SafeImg({
  src,
  fallback,
  alt,
  className,
}: {
  src?: string;
  fallback: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src || fallback);

  useEffect(() => {
    setCurrent(src || fallback);
  }, [src, fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
const EASE = "transition-all duration-300 ease-out";
const PURPLE_HOVER_SHADOW = "hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]";
const CONTRACT_PANEL_EASE = [0.4, 0, 0.2, 1] as const;
const CONTRACT_PANEL_TRANSITION = {
  height: { duration: 0.38, ease: CONTRACT_PANEL_EASE },
  opacity: { duration: 0.28, ease: "easeOut" as const },
  layout: { duration: 0.38, ease: CONTRACT_PANEL_EASE },
};

function sectionMotion(delay = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
  };
}

function parseRecord(record: string) {
  const parts = record.split("-").map((n) => parseInt(n, 10) || 0);
  return {
    wins: parts[0] ?? 0,
    losses: parts[1] ?? 0,
    draws: parts[2] ?? 0,
    hasDraws: parts.length > 2,
  };
}

function AnimatedProRecord({ proRecord }: { proRecord: string }) {
  const { wins, losses, draws, hasDraws } = useMemo(
    () => parseRecord(proRecord),
    [proRecord],
  );

  const winsMotion = useMotionValue(0);
  const winsRounded = useTransform(winsMotion, (v) => Math.round(v));
  const [winsDisplay, setWinsDisplay] = useState(0);

  useEffect(() => {
    const unsub = winsRounded.on("change", (v) => setWinsDisplay(v));
    return unsub;
  }, [winsRounded]);

  useEffect(() => {
    const controls = animate(winsMotion, wins, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [wins, proRecord, winsMotion]);

  const tail = hasDraws ? `–${losses}–${draws}` : `–${losses}`;

  return (
    <h2 className="text-3xl font-bold tabular-nums text-white">
      {winsDisplay}
      {tail}
    </h2>
  );
}

function fightToVideo(fight: LeagueFight, fighterName: string): Video {
  const org = findOrg(fight.orgId);
  return {
    id: `fight-${fight.id}`,
    title: `Тренировка с ${fighterName.charAt(0).toUpperCase()}${fighterName.slice(1).toLowerCase()}`,
    channel: org?.shortName ?? fight.orgId.toUpperCase(),
    views: fight.outcome,
    duration: "25:14",
    thumbnail:
      "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800&q=80",
    category: "MMA",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    avatar: "https://i.pravatar.cc/40?img=12",
    verified: true,
    platform: "YouTube",
  };
}

// ── Sub-sections ────────────────────────────────────────────────────────────

function StatsGrid({ pairs }: { pairs: readonly (readonly [string, string])[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 px-4">
      {pairs.map(([label, value]) => (
        <div
          key={label}
          className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md ${EASE} ${PURPLE_HOVER_SHADOW} hover:scale-[1.02] hover:bg-white/[0.06]`}
        >
          <p className="text-xs text-white/40">{label}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function statsPairsFor(
  role: RoleMode,
  stats: PassportStats,
  econ: PassportEcon,
): readonly (readonly [string, string])[] {
  if (role === "coach") {
    return [
      ["Сессии", String(econ.totalSessions)],
      ["Доход", fmtRub.format(econ.totalIncomeRub)],
      ["LVL", String(stats.level)],
      ["Combat Score", stats.combatScore.toFixed(1)],
    ];
  }
  if (role === "athlete") {
    return [
      ["Билеты", String(econ.iphoneTickets)],
      ["Streak", `${econ.dailyStreakDays} дн`],
      ["Страховка", econ.insuranceActive ? "Активна" : "—"],
      ["Баланс", fmtRub.format(econ.balanceRub)],
    ];
  }
  return [
    ["Вес", `${stats.weightKg.toFixed(1)} кг`],
    ["Рост", `${stats.heightCm ?? 178} см`],
    ["Размах", `${stats.reachCm ?? 182} см`],
    ["Возраст", String(stats.age ?? 28)],
  ];
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`shrink-0 rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 backdrop-blur ${EASE}`}
    >
      {children}
    </div>
  );
}

function PassportTop({
  name,
  nickname,
  tags,
  badges,
  accent,
  isWinner,
  role,
  portraitSrc,
}: {
  name: string;
  nickname?: string;
  tags: string[];
  badges?: string[];
  accent: string;
  isWinner: boolean;
  role: RoleMode;
  portraitSrc?: string;
}) {
  const displayName = nickname?.toUpperCase() ?? name.toUpperCase();
  const status =
    role === "fighter" && isWinner
      ? "WINNER"
      : tags[0]?.toUpperCase() ?? "ACTIVE";

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className={`absolute inset-0 rounded-full blur-md ${
              role === "coach"
                ? "bg-amber-400/40"
                : role === "athlete"
                  ? "bg-cyan-400/40"
                  : "bg-purple-500/40"
            }`}
          />
          <div
            className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black text-sm font-semibold text-white ${EASE}`}
          >
            {portraitSrc ? (
              <SafeImg
                src={portraitSrc}
                fallback={PORTRAIT_FALLBACK}
                alt={name}
                className="h-full w-full object-cover object-[center_20%]"
              />
            ) : (
              deriveInitials(name)
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold uppercase tracking-wide text-white">
            {displayName}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{
                color: accent,
                background: `${accent}18`,
                border: `1px solid ${accent}40`,
              }}
            >
              {status}
            </span>
            {tags.slice(1, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.1em] text-neutral-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      {badges && badges.length > 0 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {badges.map((badge) => (
            <Badge key={badge}>{badge}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecordBlock({
  role,
  accent,
  proRecord,
  elo,
  combatScore,
  sherdogStatus,
  econ,
  stats,
  onCreateSplit,
}: {
  role: RoleMode;
  accent: string;
  proRecord: string;
  elo: number;
  combatScore: number;
  sherdogStatus: SherdogSyncStatus;
  econ: PassportEcon;
  stats: PassportStats;
  onCreateSplit?: () => void;
}) {
  if (role === "coach") {
    return (
      <motion.div
        layout
        className={`mx-5 rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-5 ${EASE}`}
        style={{ boxShadow: `0 0 32px -12px ${accent}55` }}
      >
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
          Coach Net
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <p
            className="font-[family-name:var(--font-jetbrains-mono)] text-[clamp(2.5rem,12vw,3.25rem)] font-extrabold leading-none tracking-tight text-white"
            style={{ textShadow: `0 0 24px ${accent}88` }}
          >
            {econ.netPct}%
          </p>
          <p className="text-right font-[family-name:var(--font-jetbrains-mono)] text-sm text-neutral-400">
            {fmtRub.format(econ.totalIncomeRub)}
          </p>
        </div>
        <motion.button
          type="button"
          onClick={onCreateSplit}
          whileTap={{ scale: 0.96 }}
          className={`mt-4 w-full rounded-xl border border-amber-400/60 bg-amber-400/10 py-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 ${EASE} hover:bg-amber-400/20`}
          style={{ boxShadow: "0 0 20px -6px rgba(250,204,21,0.5)" }}
        >
          Создать Сплит
        </motion.button>
      </motion.div>
    );
  }

  if (role === "athlete") {
    return (
      <motion.div
        layout
        className={`mx-5 rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-5 ${EASE}`}
        style={{ boxShadow: `0 0 32px -12px ${accent}55` }}
      >
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
          Your Level
        </p>
        <p
          className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-[clamp(2.5rem,12vw,3.25rem)] font-extrabold leading-none tracking-tight text-white"
          style={{ textShadow: "0 0 24px rgba(0,240,255,0.5)" }}
        >
          LVL {stats.level}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full border border-cyan-400/30 bg-black/60">
          <motion.div
            className="h-full rounded-full bg-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(econ.xpPct * 100)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
            style={{ boxShadow: "0 0 10px #00F0FF" }}
          />
        </div>
        <p className="mt-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-neutral-500">
          XP {econ.xpInto}
          {econ.xpForNext != null ? ` · до lvl ${econ.xpForNext}` : " · MAX"}
        </p>
      </motion.div>
    );
  }

  const syncLabel =
    sherdogStatus === "ok"
      ? "SHERDOG SYNC: OK"
      : sherdogStatus === "syncing"
        ? "SHERDOG SYNC…"
        : null;

  const methods = stats.recordMethods ?? { ko: 0, dec: 0, sub: 0 };

  return (
    <motion.div
      layout
      className={`relative z-10 mx-4 -mt-8 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-black/80 to-purple-900/20 p-4 shadow-[0_0_40px_rgba(168,85,247,0.25)] backdrop-blur-xl ${EASE}`}
    >
      <p className="text-xs text-white/40">РЕКОРД</p>
      <AnimatedProRecord proRecord={proRecord} />
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-green-400">{methods.ko} KO</span>
        <span className="text-blue-400">{methods.dec} DEC</span>
        <span className="text-purple-400">{methods.sub} SUB</span>
      </div>
      {syncLabel ? (
        <p
          className={`mt-2 text-[8px] font-semibold uppercase tracking-[0.14em] ${
            sherdogStatus === "ok" ? "text-emerald-400/80" : "text-neutral-600"
          }`}
        >
          {syncLabel}
        </p>
      ) : null}
    </motion.div>
  );
}

function AiAnalysisCard({ text }: { text: string }) {
  return (
    <div
      className={`mx-4 mt-4 rounded-xl border border-purple-500/20 bg-white/[0.03] p-4 backdrop-blur-md ${EASE}`}
    >
      <p className="text-xs text-purple-300/80">AI анализ:</p>
      <p className="mt-1 text-sm leading-relaxed text-white/70">{text}</p>
    </div>
  );
}

function ContractsScroll({
  activeLeague,
  onLeagueClick,
}: {
  activeLeague: string | null;
  onLeagueClick: (id: string) => void;
}) {
  return (
    <div className="mt-6 px-4">
      <h3 className="mb-2 text-sm text-white/40">КОНТРАКТЫ</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {CONTRACTS.map(({ id, label }) => {
          const isActive = activeLeague === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onLeagueClick(id)}
              className={`shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-out ${PURPLE_HOVER_SHADOW} hover:border-purple-400/40 hover:bg-purple-500/20 active:scale-95 ${
                isActive ? "border-purple-400/40 bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]" : ""
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PersonalTrainingCard() {
  const router = useRouter();

  return (
    <div
      className={`mx-4 mt-6 rounded-xl border border-yellow-400/20 bg-gradient-to-br from-yellow-900/20 to-black p-4 ${EASE}`}
    >
      <p className="text-xs uppercase tracking-wider text-white/50">
        Персональные тренировки
      </p>
      <button
        type="button"
        onClick={() => router.push("/trainer")}
        className="mt-3 w-full rounded-xl py-4 font-semibold transition active:scale-[0.98]"
        style={{ background: "#C9A84C", color: "#0A0A0A" }}
      >
        🥊 Записаться на тренировку
      </button>
      <button
        type="button"
        onClick={() => router.push("/booking/1")}
        className="mt-2 w-full rounded-xl py-3 text-sm font-medium transition active:scale-[0.98]"
        style={{
          background: "rgba(201,168,76,0.15)",
          color: "#C9A84C",
          border: "0.5px solid rgba(201,168,76,0.3)",
        }}
      >
        ⚡ Персональная тренировка · от 3 000₽
      </button>
    </div>
  );
}

function LastFightPreview({
  fight,
  fighterName,
  thumbnailSrc,
  onPlay,
}: {
  fight: LeagueFight;
  fighterName: string;
  thumbnailSrc?: string;
  onPlay?: (video: Video) => void;
}) {
  const handlePlay = () => {
    onPlay?.(fightToVideo(fight, fighterName));
  };

  const displayName =
    fighterName.length > 0
      ? fighterName.charAt(0).toUpperCase() + fighterName.slice(1).toLowerCase()
      : fighterName;

  return (
    <div className="mx-4 mt-6 pb-6">
      <p className="mb-2 text-sm font-medium text-white/80">
        🎥 Тренировка с {displayName}
      </p>
      <button
        type="button"
        onClick={handlePlay}
        className={`group relative w-full overflow-hidden rounded-xl ${EASE} ${PURPLE_HOVER_SHADOW} hover:scale-[1.01] active:scale-[0.99]`}
      >
        <SafeImg
          src={thumbnailSrc}
          fallback={THUMB_FALLBACK}
          alt={`Тренировка с ${displayName}`}
          className={`h-[160px] w-full object-cover ${EASE} group-hover:scale-[1.02]`}
        />
        <div className={`absolute inset-0 bg-black/40 ${EASE} group-hover:bg-black/50`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg text-white backdrop-blur ${EASE} group-hover:scale-110 group-hover:bg-white/20`}
          >
            ▶
          </div>
        </div>
      </button>
    </div>
  );
}

// ── View ────────────────────────────────────────────────────────────────────

export function PassportView({
  role,
  stats,
  econ,
  fighterId,
  viewerId,
  totalXp = 0,
  onCreateSplit,
  onPlayVideo,
  onDonateSuccess,
}: {
  role: RoleMode;
  stats: PassportStats;
  econ: PassportEcon;
  fighterId?: string;
  viewerId?: string;
  totalXp?: number;
  onCreateSplit?: () => void;
  onPlayVideo?: (video: Video) => void;
  onDonateSuccess?: (message: string) => void;
}) {
  const accent = ROLE_ACCENT[role];
  const glow = stats.isWinner && role === "fighter" ? "#facc15" : accent;

  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [sherdogStatus, setSherdogStatus] = useState<SherdogSyncStatus>("idle");
  const [liveRecord, setLiveRecord] = useState(stats.proRecord);
  const [liveElo, setLiveElo] = useState(stats.elo);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const { setDonateOpen } = useDonateUi();
  const [donateBusy, setDonateBusy] = useState(false);
  const [donateError, setDonateError] = useState<string | null>(null);
  const [donorBalance, setDonorBalance] = useState(15_000);
  const [fundraiser, setFundraiser] = useState<FundraiserProgress>({
    title: "На сборы в Дагестан",
    goalRub: 50_000,
    raisedRub: 300,
    pct: 1,
  });

  const fighterInitials = useMemo(
    () => (stats.name ? deriveInitials(stats.name) : DEMO_FIGHTER_INITIALS),
    [stats.name],
  );

  const latestFight = useMemo(() => getLatestFight(), []);

  useEffect(() => {
    setDonateOpen(isDonateModalOpen);
    return () => setDonateOpen(false);
  }, [isDonateModalOpen, setDonateOpen]);

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

  useEffect(() => {
    const client = createWarriorBrowserClient();
    if (!client || !fighterId) return;

    void fetchFundraiserProgress(client, fighterId).then((remote) => {
      setFundraiser(localFundraiserProgress(fighterId, remote));
    });

    if (viewerId) {
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
    }
  }, [fighterId, viewerId]);

  const submitDonate: DonatePaymentHandler = useCallback(
    async (amount, comment) => {
      if (!fighterId) {
        setDonateError("Профиль бойца недоступен");
        return null;
      }
      setDonateBusy(true);
      setDonateError(null);

      const result = await submitFighterDonation(
        createWarriorBrowserClient(),
        {
          recipientId: fighterId,
          grossRub: amount,
          comment,
          viewerId,
          fundraiserFallback: fundraiser,
        },
      );

      setDonateBusy(false);

      if (!result.ok) {
        setDonateError(result.message);
        return null;
      }

      setFundraiser(result.fundraiser);
      if (result.source === "wallet") {
        setDonorBalance(result.newDonorBalance);
      }

      onDonateSuccess?.(
        `Донат ${result.grossRub.toLocaleString("ru-RU")} ₽ · бойцу +${result.netRub.toLocaleString("ru-RU")} ₽`,
      );

      return {
        grossRub: result.grossRub,
        netRub: result.netRub,
        newDonorBalance: result.newDonorBalance,
        donationId: result.donationId,
        source: result.source,
      };
    },
    [fighterId, viewerId, onDonateSuccess, fundraiser],
  );

  const closeDonateModal = useCallback(() => {
    setIsDonateModalOpen(false);
    setDonateOpen(false);
    setDonateError(null);
  }, [setDonateOpen]);

  const statPairs = statsPairsFor(role, stats, econ);

  const handleLeagueClick = (id: string) => {
    setActiveLeague((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex min-h-full flex-col gap-4 pb-2">
      <motion.div {...sectionMotion(0)}>
        <PassportTop
          name={stats.name}
          nickname={stats.nickname}
          tags={stats.tags}
          badges={stats.badges}
          accent={accent}
          isWinner={stats.isWinner}
          role={role}
          portraitSrc={stats.portraitSrc}
        />
      </motion.div>

      <motion.div
        {...sectionMotion(0.02)}
        className="mx-5 rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-3"
      >
        <RoundMini xp={totalXp} />
        <Link
          href="/levels"
          className={`mt-3 block rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-center font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-300 ${EASE} hover:bg-white/[0.08]`}
        >
          Раунды
        </Link>
      </motion.div>

      <motion.div {...sectionMotion(0.05)} className="relative shrink-0">
        <PassportHero glowColor={glow} imageSrc={stats.portraitSrc} heightClass="h-[240px]" />
        {role === "fighter" ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="fighter-record"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <RecordBlock
                role={role}
                accent={accent}
                proRecord={liveRecord}
                elo={liveElo}
                combatScore={stats.combatScore}
                sherdogStatus={sherdogStatus}
                econ={econ}
                stats={stats}
                onCreateSplit={onCreateSplit}
              />
            </motion.div>
          </AnimatePresence>
        ) : null}
      </motion.div>

      {role !== "fighter" ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            <RecordBlock
              role={role}
              accent={accent}
              proRecord={liveRecord}
              elo={liveElo}
              combatScore={stats.combatScore}
              sherdogStatus={sherdogStatus}
              econ={econ}
              stats={stats}
              onCreateSplit={onCreateSplit}
            />
          </motion.div>
        </AnimatePresence>
      ) : null}

      {role === "fighter" && fighterId ? (
        <motion.div {...sectionMotion(0.07)} className="mx-5 flex justify-center">
          <SupportFighterButton
            onClick={() => {
              setIsDonateModalOpen(true);
              setDonateOpen(true);
            }}
          />
        </motion.div>
      ) : null}

      <AnimatePresence mode="popLayout">
        <motion.div
          key={role}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
        >
          <StatsGrid pairs={statPairs} />
        </motion.div>
      </AnimatePresence>

      {stats.aiAnalysis ? (
        <motion.div {...sectionMotion(0.12)}>
          <AiAnalysisCard text={stats.aiAnalysis} />
        </motion.div>
      ) : null}

      <motion.div {...sectionMotion(0.15)}>
        <ContractsScroll
          activeLeague={activeLeague}
          onLeagueClick={handleLeagueClick}
        />
      </motion.div>

      <AnimatePresence initial={false} mode="popLayout">
        {activeLeague ? (
          <motion.div
            key={activeLeague}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={CONTRACT_PANEL_TRANSITION}
            className="mx-5 overflow-hidden rounded-xl border border-white/[0.08] bg-black/50 px-3 py-2"
          >
            <p className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[8px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              Fights · {CONTRACTS.find((c) => c.id === activeLeague)?.label ?? activeLeague.toUpperCase()}
            </p>
            <FightsList
              fights={fightsForLeague(activeLeague)}
              accent={CONTRACTS.find((c) => c.id === activeLeague)?.color ?? accent}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {role === "fighter" ? (
        <motion.div
          layout
          {...sectionMotion(0.18)}
          transition={CONTRACT_PANEL_TRANSITION}
        >
          <PersonalTrainingCard />
        </motion.div>
      ) : null}

      {role === "fighter" && latestFight ? (
        <motion.div
          layout
          {...sectionMotion(0.2)}
          transition={CONTRACT_PANEL_TRANSITION}
        >
          <LastFightPreview
            fight={latestFight}
            fighterName={stats.nickname ?? stats.name}
            thumbnailSrc={stats.trainingThumbnailSrc ?? stats.portraitSrc}
            onPlay={onPlayVideo}
          />
        </motion.div>
      ) : null}

      <DonateModal
        open={isDonateModalOpen}
        onClose={closeDonateModal}
        fighterName={stats.name}
        fighterInitials={fighterInitials}
        fundraiser={fundraiser}
        donorBalance={donorBalance}
        busy={donateBusy}
        error={donateError}
        onDonate={submitDonate}
      />
    </div>
  );
}
