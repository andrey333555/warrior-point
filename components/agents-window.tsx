"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchMonthlyXpLeaderboard,
  type MonthlyXpLeader,
} from "@/lib/supabase/read";
import { setFighterWinner } from "@/lib/supabase/admin-actions";
import { LotusIcon, type LotusPetal } from "@/components/lotus-icon";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentsWindowProps = {
  open: boolean;
  client: SupabaseClient | null;
  onWinnerChange?: (fighterId: string, isWinner: boolean) => void;
  onClose: () => void;
};

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtXp = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

// ── Gold Confetti Engine (canvas, zero dependencies) ─────────────────────────

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  alpha: number;
  decay: number;
};

const GOLD_PALETTE = [
  "#facc15", "#fbbf24", "#f59e0b", "#fde68a",
  "#fff7ae", "#f6d860", "#ffe270", "#ffffff",
];

function spawnParticles(canvas: HTMLCanvasElement, cx: number, cy: number): Particle[] {
  const count = 120;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 4 + Math.random() * 7,
      color: GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      alpha: 1,
      decay: 0.012 + Math.random() * 0.01,
    };
    void canvas; // canvas used for context only
  });
}

function runConfetti(
  canvas: HTMLCanvasElement,
  cx: number,
  cy: number,
  onDone: () => void,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) { onDone(); return () => {}; }

  let particles = spawnParticles(canvas, cx, cy);
  let raf: number;

  function draw() {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, p.alpha);
      ctx!.translate(p.x, p.y);
      ctx!.rotate((p.rotation * Math.PI) / 180);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
      ctx!.restore();

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28; // gravity
      p.vx *= 0.98; // drag
      p.rotation += p.rotSpeed;
      p.alpha -= p.decay;
    });

    particles = particles.filter((p) => p.alpha > 0);

    if (particles.length > 0) {
      raf = requestAnimationFrame(draw);
    } else {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      onDone();
    }
  }

  raf = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}

// ── Prize SVG icons ───────────────────────────────────────────────────────────

function IPhoneIcon({ size = 26, color = "#facc15" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="2" width="14" height="20" rx="3" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="18.5" r="1.1" fill={color} />
      <line x1="9" y1="5" x2="15" y2="5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GlovesIcon({ size = 26, color = "#facc15" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 20v-9a3 3 0 0 1 3-3h1V5.5a1.5 1.5 0 0 1 3 0V8h.5a2 2 0 0 1 2 2v10" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 20h12" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 8V7a1 1 0 0 1 1-1" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function WrapIcon({ size = 26, color = "#facc15" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12 Q8 7 12 12 Q16 17 20 12" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M4 15 Q8 10 12 15 Q16 20 20 15" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M4 9 Q8 4 12 9 Q16 14 20 9" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
}

// ── Prize Fund Row ────────────────────────────────────────────────────────────

const PRIZE_ITEMS: Array<{
  key: string;
  name: string;
  icon: React.ReactNode;
  petals: LotusPetal[];
}> = [
  {
    key: "iphone",
    name: "iPhone 16",
    icon: <IPhoneIcon size={26} color="#facc15" />,
    petals: [
      { label: "Приз", value: "iPhone 16" },
      { label: "Ценность", value: fmtRub.format(99990) },
      { label: "Условие", value: "Топ-1 XP за квартал" },
      { label: "Доставка", value: "Россия · 7 дней" },
    ],
  },
  {
    key: "gloves",
    name: "Перчатки",
    icon: <GlovesIcon size={26} color="#facc15" />,
    petals: [
      { label: "Приз", value: "Боевые перчатки" },
      { label: "Бренд", value: "Rival / Cleto Reyes" },
      { label: "Ценность", value: fmtRub.format(18000) },
      { label: "Условие", value: "Топ-2 XP за квартал" },
    ],
  },
  {
    key: "wraps",
    name: "Бинты",
    icon: <WrapIcon size={26} color="#facc15" />,
    petals: [
      { label: "Приз", value: "Профи-бинты · 5м" },
      { label: "Ценность", value: fmtRub.format(3500) },
      { label: "Условие", value: "Топ-3 XP за квартал" },
      { label: "Поставка", value: "КУЗНЯ · Москва" },
    ],
  },
];

function PrizeFundRow() {
  return (
    <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/[0.04] px-5 py-4">
      <p className="mb-3 font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/80">
        Призовой Фонд · Квартал
      </p>
      <div className="flex items-center justify-center gap-10 pt-6 pb-8">
        {PRIZE_ITEMS.map((item, idx) => (
          <div key={item.key} className="flex flex-col items-center gap-2">
            {/* Size/radius scale by rank: 1st is biggest */}
            <LotusIcon
              name={item.name}
              accent="#facc15"
              petals={item.petals}
              size={idx === 0 ? 48 : idx === 1 ? 40 : 34}
              radius={idx === 0 ? 72 : 62}
              closeOnOutside
            >
              <div
                className="flex items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/10"
                style={{
                  width: idx === 0 ? 48 : idx === 1 ? 40 : 34,
                  height: idx === 0 ? 48 : idx === 1 ? 40 : 34,
                  boxShadow: "0 0 20px rgba(234,179,8,0.5)",
                }}
              >
                {item.icon}
              </div>
            </LotusIcon>
            <span className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.22em] text-amber-200/70">
              {idx === 0 ? "①" : idx === 1 ? "②" : "③"} {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AgentsWindow({
  open,
  client,
  onClose,
  onWinnerChange,
}: AgentsWindowProps) {
  const [rows, setRows] = useState<MonthlyXpLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [echo, setEcho] = useState<{ tone: "ok" | "err"; message: string } | null>(null);

  // Canvas ref for gold confetti
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelConfettiRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    if (!client) {
      setRows([]);
      setLoading(false);
      setEcho({ tone: "err", message: "Supabase не настроен" });
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMonthlyXpLeaderboard(client, { days: 30, limit: 10 });
      setRows(data);
    } catch (err) {
      console.error("[Agents Window] fetch error:", err);
      setEcho({ tone: "err", message: (err as Error).message });
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!echo || echo.tone !== "ok") return undefined;
    const id = window.setTimeout(() => setEcho(null), 4200);
    return () => window.clearTimeout(id);
  }, [echo]);

  // Cleanup confetti canvas on unmount / close
  useEffect(() => {
    if (!open) cancelConfettiRef.current?.();
  }, [open]);

  // ── Confetti burst ────────────────────────────────────────────────────────

  const fireConfetti = useCallback((buttonEl: HTMLButtonElement | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas to fill the dialog
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Burst origin: centre of button or dialog centre
    let cx = canvas.width / 2;
    let cy = canvas.height / 2;

    if (buttonEl) {
      const br = buttonEl.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      cx = br.left - cr.left + br.width / 2;
      cy = br.top - cr.top + br.height / 2;
    }

    cancelConfettiRef.current?.();
    cancelConfettiRef.current = runConfetti(canvas, cx, cy, () => {
      cancelConfettiRef.current = null;
    });
  }, []);

  // ── Set winner ────────────────────────────────────────────────────────────

  const handleSetWinner = useCallback(
    async (
      fighterId: string,
      nextIsWinner: boolean,
      buttonEl: HTMLButtonElement | null,
    ) => {
      if (!client) return;
      setBusyId(fighterId);

      // Fire confetti before hitting Supabase for a snappy feel
      if (nextIsWinner) fireConfetti(buttonEl);

      try {
        const { error } = await setFighterWinner(client, fighterId, nextIsWinner);

        if (error) {
          setEcho({ tone: "err", message: error.message });
          return;
        }

        setEcho({
          tone: "ok",
          message: nextIsWinner
            ? `★ ${fighterId} — Winner of the Quarter · is_winner=true синхронизирован`
            : `${fighterId} — статус снят`,
        });

        // Optimistic patch
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
    [client, fireConfetti, onWinnerChange, refresh],
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
            {/* Gold confetti canvas — absolute, pointer-events:none */}
            <canvas
              ref={canvasRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 rounded-3xl"
            />

            <div className="rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-amber-500/[0.07] via-black/85 to-black/95 px-5 py-6 sm:px-7 sm:py-8">

              {/* Header */}
              <header className="flex items-start justify-between gap-3 border-b border-amber-400/15 pb-5">
                <div>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/95">
                    Admin Panel · Trophy
                  </p>
                  <h2
                    id="agents-window-title"
                    className="mt-1 font-[family-name:var(--font-geist-mono)] text-xl font-semibold uppercase tracking-[0.16em] text-white sm:text-2xl"
                  >
                    Agents Window
                  </h2>
                  <p className="mt-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">
                    30-day XP surge · кандидаты на победителя квартала
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md border border-white/[0.1] bg-black/65 px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:border-amber-300 hover:text-amber-200"
                >
                  esc
                </button>
              </header>

              {/* Prize Fund */}
              <PrizeFundRow />

              {/* Echo */}
              <AnimatePresence>
                {echo ? (
                  <motion.p
                    key={echo.message}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
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

              {/* Leaderboard Table */}
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/55">
                <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4.5rem_minmax(8rem,auto)] gap-2 border-b border-amber-400/15 bg-black/65 px-3 py-2.5 font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.22em] text-amber-300/95 sm:grid-cols-[3rem_minmax(0,1fr)_5.5rem_5.5rem_minmax(11rem,auto)] sm:gap-3 sm:px-4 sm:text-[10.5px]">
                  <span>#</span>
                  <span>Боец</span>
                  <span className="text-right">XP·30d</span>
                  <span className="text-right">Сессии</span>
                  <span className="text-right">Действие</span>
                </div>

                <ul className="max-h-[40vh] divide-y divide-white/[0.05] overflow-y-auto">
                  {loading ? (
                    <li className="px-4 py-8 text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                      Загружаю месячный леджер…
                    </li>
                  ) : rows.length === 0 ? (
                    <li className="px-4 py-8 text-center font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                      Нет сессий за последние 30 дней
                    </li>
                  ) : (
                    rows.map((row) => {
                      const busy = busyId === row.fighterSlug;
                      const { isWinner } = row;

                      return (
                        <motion.li
                          key={row.fighterSlug}
                          layout
                          className={[
                            "grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4.5rem_minmax(8rem,auto)] items-center gap-2 px-3 py-2.5 transition-colors sm:grid-cols-[3rem_minmax(0,1fr)_5.5rem_5.5rem_minmax(11rem,auto)] sm:gap-3 sm:px-4 sm:py-3",
                            isWinner
                              ? "bg-amber-500/[0.06]"
                              : "hover:bg-white/[0.02]",
                          ].join(" ")}
                        >
                          {/* Rank */}
                          <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-amber-200/95">
                            #{row.rank}
                          </span>

                          {/* Name + winner badge */}
                          <span className="min-w-0 truncate">
                            <span className="font-[family-name:var(--font-geist-mono)] text-[12.5px] uppercase tracking-[0.08em] text-zinc-200">
                              {row.displayName}
                            </span>
                            <AnimatePresence>
                              {isWinner ? (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.85 }}
                                  className="ml-2 inline-flex items-center rounded-full border border-amber-400/55 bg-amber-500/[0.14] px-2 py-[1px] font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.2em] text-amber-200"
                                  style={{ boxShadow: "0 0 14px -4px rgba(250,204,21,0.6)" }}
                                >
                                  ★ Winner
                                </motion.span>
                              ) : null}
                            </AnimatePresence>
                          </span>

                          {/* XP */}
                          <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-amber-200">
                            {fmtXp.format(row.xp30d)}
                          </span>

                          {/* Sessions */}
                          <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-zinc-400">
                            {row.sessions30d}
                          </span>

                          {/* Action */}
                          <span className="text-right">
                            <motion.button
                              type="button"
                              disabled={busy || !client}
                              onClick={(e) =>
                                void handleSetWinner(
                                  row.fighterSlug,
                                  !isWinner,
                                  e.currentTarget,
                                )
                              }
                              whileTap={{ scale: busy ? 1 : 0.96 }}
                              animate={
                                isWinner
                                  ? {
                                      boxShadow: [
                                        "0 0 0px rgba(250,204,21,0)",
                                        "0 0 18px rgba(250,204,21,0.5)",
                                        "0 0 0px rgba(250,204,21,0)",
                                      ],
                                    }
                                  : undefined
                              }
                              transition={
                                isWinner
                                  ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                  : undefined
                              }
                              className={
                                isWinner
                                  ? "rounded-full border border-rose-400/45 bg-rose-500/[0.1] px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200 transition-colors hover:border-rose-300 disabled:opacity-50"
                                  : "rounded-full border border-amber-400/55 bg-amber-500/[0.1] px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 shadow-[0_0_18px_-8px_rgba(250,204,21,0.65)] transition-colors hover:border-amber-300 hover:text-amber-100 disabled:opacity-50"
                              }
                            >
                              {busy ? "СИНХ…" : isWinner ? "СНЯТЬ" : "НАЗНАЧИТЬ"}
                            </motion.button>
                          </span>
                        </motion.li>
                      );
                    })
                  )}
                </ul>
              </div>

              {/* Footer */}
              <p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[10.5px] leading-relaxed text-zinc-500">
                Источник:{" "}
                <span className="text-zinc-300">RPC get_monthly_xp_leaders(30, 10)</span>
                {" "}→ server-side{" "}
                <span className="text-amber-200">SUM(xp_awarded)</span>.{" "}
                «НАЗНАЧИТЬ» пишет{" "}
                <span className="text-amber-200">is_winner=true</span> в{" "}
                <span className="text-zinc-300">fighter_stats</span>{" "}
                · золотые конфетти подтверждают успех.
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
