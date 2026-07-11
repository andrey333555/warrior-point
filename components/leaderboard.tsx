"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { fighters, getGymName, findTrainer, findGym, type Fighter } from "@/lib/fighters";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDonateUi } from "@/hooks/use-donate-ui";
import { getCalibration } from "@/lib/calibration-store";
import { DEMO_FIGHTER_DB_ID, DEMO_FIGHTER_DISPLAY_NAME } from "@/lib/warrior-constants";

function cloneFighters() {
  return fighters.map((f) => ({ ...f }));
}

type CurrentUser = {
  name: string;
  elo: number;
  round: number;
  wins: number;
};

/** Fallback demo passport when calibration hasn't been set yet. */
const DEFAULT_CURRENT_USER: CurrentUser = {
  name: DEMO_FIGHTER_DISPLAY_NAME,
  elo: 1642,
  round: 12,
  wins: 27,
};

function parseWins(record: string): number {
  const parts = record.split("-").map((p) => Number.parseInt(p, 10));
  return Number.isFinite(parts[0]) ? parts[0]! : 0;
}

function eloToRound(elo: number): number {
  return Math.min(23, Math.max(1, Math.round(elo / 140)));
}

/** Read the viewer's real passport (calibration) for the compare drawer. */
function resolveCurrentUser(): CurrentUser {
  const calibration = getCalibration(DEMO_FIGHTER_DB_ID);
  if (!calibration) return DEFAULT_CURRENT_USER;
  return {
    name: DEMO_FIGHTER_DISPLAY_NAME,
    elo: calibration.startingElo,
    round: eloToRound(calibration.startingElo),
    wins: calibration.record.wins,
  };
}

function formatDelta(value: number, suffix = ""): string {
  if (value === 0) return "0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

// ── Compare drawer ────────────────────────────────────────────────────────────

function StatColumn({
  label,
  you,
  them,
  delta,
  highlight,
}: {
  label: string;
  you: string | number;
  them: string | number;
  delta: number;
  highlight?: "ahead" | "behind" | "neutral";
}) {
  const deltaColor =
    highlight === "ahead"
      ? "text-emerald-400"
      : highlight === "behind"
        ? "text-amber-400"
        : "text-zinc-500";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3">
      <div className="text-right">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-600">
          {label}
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold tabular-nums text-cyan-200">
          {you}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold tabular-nums ${deltaColor}`}
      >
        {formatDelta(delta)}
      </span>
      <div>
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-600">
          {label}
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold tabular-nums text-white">
          {them}
        </p>
      </div>
    </div>
  );
}

function CompareDrawer({
  fighter,
  onClose,
}: {
  fighter: Fighter;
  onClose: () => void;
}) {
  const router = useRouter();
  const trainer = findTrainer(fighter.trainerId);
  const gym = findGym(fighter.gyms[0] ?? 0);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_CURRENT_USER);

  const fighterWins = parseWins(fighter.record);
  const fighterRound = eloToRound(fighter.elo);

  const eloDelta = fighter.elo - currentUser.elo;
  const roundDelta = fighterRound - currentUser.round;
  const winsDelta = fighterWins - currentUser.wins;

  const motivation =
    roundDelta > 0
      ? `до этого уровня: +${roundDelta} ${roundDelta === 1 ? "раунд" : roundDelta < 5 ? "раунда" : "раундов"}`
      : roundDelta < 0
        ? `Ты на ${Math.abs(roundDelta)} ${Math.abs(roundDelta) === 1 ? "раунд" : Math.abs(roundDelta) < 5 ? "раунда" : "раундов"} выше — закрепляй ELO`
        : eloDelta > 0
          ? `На одном раунде — добери +${eloDelta} ELO`
          : "Ты впереди по рейтингу — держи темп";

  useEffect(() => {
    setMounted(true);
    setCurrentUser(resolveCurrentUser());
  }, []);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#0A0A0A]/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl border-t border-zinc-800 bg-zinc-950 px-5 pb-10 pt-4"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />

        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-yellow-400/80">
          Сравнение
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.06] px-3 py-2.5">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.2em] text-cyan-400/80">
              Ты
            </p>
            <p className="mt-1 truncate font-[family-name:var(--font-geist-sans)] text-base font-bold text-cyan-100">
              {currentUser.name}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2.5">
            <p className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.2em] text-zinc-500">
              Боец
            </p>
            <p className="mt-1 truncate font-[family-name:var(--font-geist-sans)] text-base font-bold text-white">
              {fighter.name}
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4">
          <StatColumn
            label="ELO"
            you={currentUser.elo}
            them={fighter.elo}
            delta={eloDelta}
            highlight={eloDelta > 0 ? "behind" : eloDelta < 0 ? "ahead" : "neutral"}
          />
          <StatColumn
            label="Раунд"
            you={currentUser.round}
            them={fighterRound}
            delta={roundDelta}
            highlight={roundDelta > 0 ? "behind" : roundDelta < 0 ? "ahead" : "neutral"}
          />
          <StatColumn
            label="Побед"
            you={currentUser.wins}
            them={fighterWins}
            delta={winsDelta}
            highlight={winsDelta > 0 ? "behind" : winsDelta < 0 ? "ahead" : "neutral"}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.06] px-4 py-3 text-center">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.16em] text-yellow-300/90">
            {motivation}
          </p>
          {eloDelta > 0 ? (
            <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-xs text-zinc-400">
              ELO-разрыв: {formatDelta(eloDelta)} · {trainer?.name ?? "тренер"} · {gym?.name ?? "зал"}
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              onClose();
              router.push(`/gym/${fighter.gyms[0]}`);
            }}
          >
            🏟 {gym?.name ?? "Зал"}
          </Button>
          <Button
            fullWidth
            onClick={() => {
              onClose();
              router.push(`/booking/${fighter.trainerId}`);
            }}
          >
            Тренироваться
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ── Main leaderboard ──────────────────────────────────────────────────────────

export default function Leaderboard() {
  const router = useRouter();
  const { setFighterModalOpen } = useDonateUi();
  const [data, setData] = useState(() => cloneFighters());
  const [tick, setTick] = useState(0);
  const [comparing, setComparing] = useState<Fighter | null>(null);

  useEffect(() => {
    setFighterModalOpen(!!comparing);
    return () => setFighterModalOpen(false);
  }, [comparing, setFighterModalOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) =>
        prev.map((f) => ({
          ...f,
          elo: f.elo + 1 + Math.floor(Math.random() * 4),
          change: 1 + Math.floor(Math.random() * 4),
        })),
      );
      setTick((t) => t + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const closeCompare = () => {
    setComparing(null);
    setFighterModalOpen(false);
  };

  const sorted = [...data].sort((a, b) => b.elo - a.elo);

  return (
    <>
      <div className="p-4 pb-24 text-white">
        <div className="mb-4 flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            LEADERBOARD
          </motion.h1>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
        </div>

        <div className="space-y-3">
          {sorted.map((f, index) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ layout: { type: "spring", stiffness: 400, damping: 30 } }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">
                    #{index + 1} • {f.city}
                  </p>
                  <p className="font-semibold">{f.name}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-400">{f.record}</p>
                  <motion.p
                    key={`${f.id}-${f.elo}-${tick}`}
                    initial={{ scale: 1.2, color: "#facc15" }}
                    animate={{ scale: 1, color: "#ffffff" }}
                    transition={{ duration: 0.4 }}
                    className="text-lg font-bold tabular-nums"
                  >
                    {f.elo}
                  </motion.p>
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                +{f.change} за последнюю победу
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => router.push(`/gym/${f.gyms[0]}`)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-gray-300 transition-colors hover:border-yellow-400/40 hover:text-yellow-400"
                >
                  🏟 {getGymName(f.gyms[0]!)}
                </button>
                <span className="rounded-lg bg-zinc-800/50 px-2.5 py-1 text-gray-500">
                  {f.style.join(" · ")}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  fullWidth
                  className="flex-1"
                  onClick={() => router.push(`/booking/${f.trainerId}`)}
                >
                  Тренироваться
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  className="flex-1"
                  onClick={() => {
                    setComparing(f);
                    setFighterModalOpen(true);
                  }}
                >
                  Сравнить
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          ELO — рейтинг силы бойца. Обновляется после тренировок и боёв.
        </p>
      </div>

      <AnimatePresence>
        {comparing ? (
          <CompareDrawer fighter={comparing} onClose={closeCompare} />
        ) : null}
      </AnimatePresence>
    </>
  );
}
