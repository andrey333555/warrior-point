"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fighters, getGymName, findTrainer, findGym, type Fighter } from "@/lib/fighters";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function cloneFighters() {
  return fighters.map((f) => ({ ...f }));
}

// ── Compare drawer ────────────────────────────────────────────────────────────

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
      <span className="text-right text-sm font-semibold text-white">{a}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-widest text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-white">{b}</span>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl border-t border-zinc-800 bg-zinc-950 px-5 pb-10 pt-4"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />

        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-yellow-400/80">
          Профиль бойца
        </p>
        <h2 className="mt-1 text-xl font-bold text-white">{fighter.name}</h2>

        <div className="mt-5 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900 px-4">
          <CompareRow label="рекорд" a={fighter.record} b={`ELO ${fighter.elo}`} />
          <CompareRow label="стиль" a={fighter.style.join(" · ")} b={`+${fighter.change}`} />
          <CompareRow
            label="тренер"
            a={trainer?.name ?? "—"}
            b={gym?.name ?? "—"}
          />
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
    </motion.div>
  );
}

// ── Main leaderboard ──────────────────────────────────────────────────────────

export default function Leaderboard() {
  const router = useRouter();
  const [data, setData] = useState(() => cloneFighters());
  const [tick, setTick] = useState(0);
  const [comparing, setComparing] = useState<Fighter | null>(null);

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
                  onClick={() => setComparing(f)}
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
          <CompareDrawer fighter={comparing} onClose={() => setComparing(null)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}
