"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceFighterXp,
  DEMO_SESSION_GROSS_RUB,
  deriveLevel,
  PLATFORM_COMMISSION_PCT,
  recordTrainingSessionRub,
  xpBracketProgress,
  type FighterAdvancerResult,
  type SettlementBreakdown,
  type TrainingSessionEconomyResult,
} from "@/lib/economy";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { persistWarriorTrainingSession } from "@/lib/supabase/warrior-sync";
import { fetchFighterHydration } from "@/lib/supabase/read";
import {
  DEMO_FIGHTER_DB_ID,
  DEMO_FIGHTER_DISPLAY_ID,
} from "@/lib/warrior-constants";

const SHOWCASE = {
  elo: 1642,
  eloDelta30d: 12,
  globalPct: 8.4,
};

type LevelBurst = Pick<FighterAdvancerResult, "levelAfter" | "levelsJumped">;

export function WarriorPassport() {
  const totalXpRef = useRef(0);

  const [totalXp, setTotalXp] = useState(0);

  const [careerGrossRub, setCareerGrossRub] = useState(0);
  const [careerCommissionRub, setCareerCommissionRub] = useState(0);
  const [careerNetRub, setCareerNetRub] = useState(0);

  const [sessionsRecorded, setSessionsRecorded] = useState(0);

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

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bracket = xpBracketProgress(totalXp);
  const level = deriveLevel(totalXp);

  const fmt = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });

  useEffect(() => {
    totalXpRef.current = totalXp;
  }, [totalXp]);

  useEffect(() => {
    let aborted = false;

    (async () => {
      const client = createWarriorBrowserClient();

      if (!client) {
        if (!aborted) setRemoteBootstrapped(true);

        return;
      }

      try {
        const ledger = await fetchFighterHydration(client, DEMO_FIGHTER_DB_ID);

        if (aborted) return;

        totalXpRef.current = ledger.totalXp;

        setTotalXp(ledger.totalXp);
        setCareerGrossRub(ledger.careerGrossRub);
        setCareerCommissionRub(ledger.careerCommissionRub);
        setCareerNetRub(ledger.careerNetRub);

        setSessionsRecorded(ledger.sessionsCount);
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

      const { error } = await persistWarriorTrainingSession(client, {
        fighterId: DEMO_FIGHTER_DB_ID,
        economics,
        advancement,
      });

      if (error) {
        console.error("[Warrior Point] Supabase persist error:", error);
        setLedgerEcho({ tone: "err", message: error.message });

        return;
      }

      console.log("Data synced with Supabase!");
      setLedgerEcho({ tone: "ok", message: "Data synced with Supabase!" });
    } finally {
      setSessionSyncBusy(false);
    }
  }, []);

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

  const pctArc = Math.max(2, (level / 23) * 100);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-50">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.38]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "52px 52px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-cyan-500/[0.06] via-transparent to-fuchsia-500/[0.06]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-5 py-10 pb-28 sm:max-w-2xl sm:px-8 sm:py-14 sm:pb-32">
        {!remoteBootstrapped ? (
          <p className="-mb-5 rounded-lg border border-cyan-500/35 bg-black/65 px-3 py-2 text-center font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200/95">
            Rehydrating sovereign ledger…
          </p>
        ) : null}

        <AnimatePresence mode="sync">
          {levelBurst !== null ? (
            <motion.div
              key="level-veil"
              className="fixed inset-0 z-40 flex cursor-pointer items-center justify-center bg-black/85 px-6 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setLevelBurst(null)}
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
                    Rank {levelBurst.levelAfter}
                    <span className="text-zinc-500"> /23</span>
                  </motion.p>

                  {levelBurst.levelsJumped > 1 ? (
                    <motion.p
                      className="mt-2 text-sm uppercase tracking-[0.25em] text-fuchsia-300/95"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.55 }}
                    >
                      +{levelBurst.levelsJumped} tier jumps · surge certified
                    </motion.p>
                  ) : (
                    <motion.p
                      className="mt-2 text-[11px] uppercase tracking-[0.32em] text-zinc-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.55 }}
                    >
                      Global ladder updated
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <section className="rounded-2xl border border-white/[0.12] bg-gradient-to-br from-zinc-950/95 via-black/85 to-black/90 p-[1px] shadow-[0_0_120px_-30px_rgba(34,211,238,0.35)]">
          <div className="rounded-[calc(1rem-1px)] bg-gradient-to-br from-white/[0.05] via-transparent to-fuchsia-500/[0.04] p-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:p-7">
            <div className="mb-5 flex-1 sm:mb-0 sm:mr-10">
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-400/90">
                Training ledger sync
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
                Ingest sanctioned session economics: platform fee enforced at{" "}
                <span className="font-medium text-white">
                  {PLATFORM_COMMISSION_PCT}%
                </span>
                · XP aligns with payout after withholdings.
              </p>
              {ledgerEcho ? (
                <p
                  role="status"
                  className={
                    ledgerEcho.tone === "ok"
                      ? "mt-4 rounded-lg border border-emerald-400/35 bg-emerald-500/[0.12] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200"
                      : "mt-4 rounded-lg border border-amber-500/35 bg-amber-500/[0.1] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100"
                  }
                >
                  {ledgerEcho.message}
                </p>
              ) : null}
              {lastSession ? (
                <LastSessionRibbon
                  breakdown={lastSession.breakdown}
                  xpAward={lastSession.xpAward}
                  fmt={fmt}
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="text-right font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                <span className="block text-[10px] text-zinc-600">
                  Bill per session · demo
                </span>
                <span className="mt-2 block text-sm text-white sm:text-lg">
                  {fmt.format(DEMO_SESSION_GROSS_RUB)}
                </span>
              </div>
              <motion.button
                type="button"
                onClick={() => void recordSession()}
                disabled={sessionSyncBusy || !remoteBootstrapped}
                aria-busy={sessionSyncBusy || !remoteBootstrapped}
                className="group relative shrink-0 overflow-hidden rounded-xl border border-cyan-400/55 bg-black/60 px-6 py-3.5 font-[family-name:var(--font-geist-mono)] text-xs font-semibold uppercase tracking-[0.42em] text-cyan-200 shadow-[0_0_32px_-6px_rgba(34,211,238,0.55)] disabled:pointer-events-none disabled:opacity-50 sm:py-4"
                whileTap={{ scale: sessionSyncBusy ? 1 : 0.98 }}
                whileHover={{
                  scale: 1.01,
                  boxShadow:
                    "0 0 45px -4px rgba(34,211,238,0.65), inset 0 0 55px rgba(34,211,238,0.08)",
                  borderColor: "rgba(244,232,212,0.35)",
                }}
              >
                <span className="pointer-events-none absolute inset-0 translate-y-full bg-gradient-to-t from-cyan-500/[0.12] via-transparent opacity-0 transition duration-500 group-hover:translate-y-1/3 group-hover:opacity-100" />
                {sessionSyncBusy ? "SYNC…" : "RECORD SESSION"}
              </motion.button>
            </div>
          </div>
        </section>

        <header className="flex flex-col gap-3 border-b border-white/[0.08] pb-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-cyan-400/90">
            Warrior Passport
          </p>
          <p className="text-sm text-zinc-500">
            Global combat registry · Cross-border credential
          </p>
        </header>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                Combatant ID
              </p>
              <h1 className="font-[family-name:var(--font-geist-mono)] text-3xl font-medium tracking-[0.04em] text-white sm:text-4xl">
                {DEMO_FIGHTER_DISPLAY_ID}
              </h1>
            </div>
            <motion.div layout className="text-right">
              <p className="mb-1 text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                Tier rank
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={level}
                  className="font-[family-name:var(--font-geist-mono)] text-xl text-cyan-300 sm:text-2xl"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                >
                  Level {level}
                  <span className="text-zinc-500">/23</span>
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] uppercase tracking-wider text-zinc-500">
              <span>XP arc · tier {bracket.level}</span>
              <span>
                {bracket.xpForNext !== null
                  ? `${Math.ceil(bracket.xpForNext)} XP to next gate`
                  : "Grandmaster orbit"}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-fuchsia-500 shadow-[0_0_28px_rgba(34,211,238,0.5)]"
                layout
                initial={false}
                animate={{
                  width: `${Math.min(100, Math.max(bracket.pctInLevel * 100, 3))}%`,
                }}
                transition={{ type: "spring", stiffness: 220, damping: 28 }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] uppercase tracking-wider text-zinc-500">
              <span>Global progression echo</span>
              <span>Grandmaster frontier</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 via-cyan-300/50 to-fuchsia-500/60"
                style={{ width: `${Math.min(pctArc, 100)}%` }}
              />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-md sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl motion-safe:animate-pulse" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl motion-safe:animate-pulse motion-safe:[animation-delay:750ms]" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Global ELO
              </p>
              <p className="font-[family-name:var(--font-geist-mono)] text-5xl font-semibold tabular-nums tracking-tight text-white sm:text-6xl motion-safe:[text-shadow:_0_0_42px_rgba(34,211,238,0.35)]">
                {SHOWCASE.elo}
              </p>
              <p className="mt-3 flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-emerald-400">
                <span className="motion-safe:inline-block motion-safe:animate-pulse">
                  ↑
                </span>
                {SHOWCASE.eloDelta30d} last 30 days
              </p>
            </div>

            <div className="rounded-xl border border-cyan-400/25 bg-black/45 px-4 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                Worldwide standing
              </p>
              <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-2xl text-cyan-200">
                Top {SHOWCASE.globalPct}%
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                percentile · live leaderboard pool
              </p>
            </div>
          </div>

          <div className="relative mt-6 flex h-10 items-end gap-0.5 sm:gap-1">
            {[0.35, 0.5, 0.42, 0.62, 0.55, 0.71, 0.68, 0.82, 0.77, 0.9].map(
              (h, i) => (
                <span
                  key={i}
                  className="flex-1 origin-bottom rounded-sm bg-gradient-to-t from-cyan-600/30 to-cyan-400 motion-safe:animate-[pulse_2.8s_ease-in-out_infinite]"
                  style={{
                    height: `${h * 100}%`,
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ),
            )}
          </div>

          <p className="mt-5 flex flex-wrap gap-x-2 text-[11px] text-zinc-500">
            <span>Trial sessions audited · lifetime</span>
            <motion.span
              key={sessionsRecorded}
              className="font-[family-name:var(--font-geist-mono)] text-zinc-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {sessionsRecorded}
            </motion.span>
          </p>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-zinc-950/65 p-5 sm:p-6">
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
            Sovereign payouts · RUB
          </h2>
          <ul className="space-y-3 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums sm:text-base">
            <li className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
              <span className="text-zinc-400">Gross settlements</span>
              <span className="text-white">{fmt.format(careerGrossRub)}</span>
            </li>
            <li className="flex justify-between gap-4 border-b border-white/[0.06] pb-3">
              <span className="text-zinc-400">
                Platform fee ({PLATFORM_COMMISSION_PCT}%)
              </span>
              <span className="text-amber-200/95">
                −{fmt.format(Math.round(careerCommissionRub))}
              </span>
            </li>
            <li className="flex justify-between gap-4 pt-1">
              <span className="font-medium uppercase tracking-wide text-zinc-300">
                Net to combatant
              </span>
              <span className="text-xl font-semibold text-white sm:text-2xl">
                {fmt.format(Math.round(careerNetRub))}
              </span>
            </li>
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
            Figures mirror Warrior Point withholdings · every sanctioned training
            line subject to nineteen‑percent protocol levy.
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-black/80 to-black/90 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-400/90">
              Biometrics
            </h2>
            <span className="rounded-full border border-emerald-500/45 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
              Ready for Apple Health
            </span>
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            Encrypted physiological reserve for cross‑border sanction reviews.
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center sm:gap-4">
            {[
              { label: "HRV", val: "—", hint: "sync standby" },
              { label: "Recovery", val: "—", hint: "sync standby" },
              { label: "Load index", val: "—", hint: "sync standby" },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-white/[0.06] bg-black/35 px-2 py-3 sm:py-4"
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

        <footer className="border-t border-white/[0.06] pt-8 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          Warrior Point · Sovereign ledger · Worldwide
        </footer>
      </main>
    </div>
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
      className="mt-4 rounded-lg border border-cyan-400/25 bg-black/55 px-3 py-2.5 sm:px-4"
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        Latest sanction
      </p>
      <ul className="mt-2 grid gap-1 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-zinc-300 sm:text-xs">
        <li className="flex justify-between gap-3">
          <span className="text-zinc-500">Gross</span>
          <span>{fmt.format(breakdown.gross)}</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="text-zinc-500">Fee {breakdown.commissionPct}%</span>
          <span className="text-amber-200/95">
            −{fmt.format(breakdown.commission)}
          </span>
        </li>
        <li className="flex justify-between gap-3 pt-1 text-white">
          <span className="uppercase tracking-wider text-zinc-400">Net</span>
          <span>{fmt.format(breakdown.net)}</span>
        </li>
        <li className="flex justify-between gap-3 border-t border-white/[0.06] pt-2 text-cyan-200">
          <span className="text-zinc-500">XP routed</span>
          <span>+{xpAward}</span>
        </li>
      </ul>
    </motion.div>
  );
}
