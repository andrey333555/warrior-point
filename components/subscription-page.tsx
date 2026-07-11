"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DEFAULT_TRAINER_IMAGE, type Trainer } from "@/lib/network";
import { useSubscription } from "@/lib/subscriptions";
import { useBackOrHome } from "@/hooks/use-back-or-home";
import { Button } from "@/components/ui/button";

const PERKS = [
  "8 тренировок в месяц",
  "Приоритетная запись на слоты",
  "Доступ ко всем сплитам",
  "Персональный game plan",
  "Чат с тренером (скоро)",
];

type Screen = "info" | "paying" | "done";

export default function SubscriptionPage({ trainer }: { trainer: Trainer }) {
  const goBack = useBackOrHome(`/trainer/${trainer.id}`);
  const { subscribed, subscribe } = useSubscription(trainer.id);
  const [screen, setScreen] = useState<Screen>("info");
  const [paying, setPaying] = useState(false);

  const slots = trainer.subscriptionSlots ?? 20;
  const subs = trainer.currentSubscribers ?? 0;
  const remaining = slots - subs;
  const price = trainer.subscriptionPrice ?? 7990;

  const handleSubscribe = () => {
    if (paying) return;
    setPaying(true);
    setScreen("paying");
    setTimeout(() => {
      subscribe();
      setPaying(false);
      setScreen("done");
    }, 1600);
  };

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      {/* Header */}
      <header className="relative flex items-center px-4 py-4">
        <button
          type="button"
          onClick={goBack}
          className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
        >
          ← Назад
        </button>
      </header>

      {/* Hero banner */}
      <div className="relative mx-4 overflow-hidden rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trainer.image || DEFAULT_TRAINER_IMAGE}
          alt={trainer.name}
          className="h-[220px] w-full object-cover object-[center_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Glow ring */}
        <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-yellow-400/20" />

        {/* Elite badge */}
        <div className="absolute left-4 top-4">
          <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-400 backdrop-blur-md">
            Elite Access
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-yellow-400/80">
            Тренер
          </p>
          <h1 className="mt-1 text-2xl font-bold">{trainer.name}</h1>
        </div>
      </div>

      <div className="px-4 pb-36 pt-6">
        <AnimatePresence mode="wait">

          {/* ── Paying ─────────────────────────────────────────────────── */}
          {screen === "paying" ? (
            <motion.div
              key="paying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                className="h-10 w-10 rounded-full border-2 border-yellow-400/30 border-t-yellow-400"
              />
              <p className="text-sm text-gray-400">Оформляем подписку…</p>
            </motion.div>

          /* ── Done ──────────────────────────────────────────────────── */
          ) : screen === "done" ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="flex flex-col items-center gap-5 py-12 text-center"
            >
              {/* Animated badge */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 380, damping: 18 }}
                className="relative flex h-24 w-24 items-center justify-center"
              >
                <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400/40 bg-yellow-400/10">
                  <span className="text-4xl">✅</span>
                </div>
              </motion.div>

              <div>
                <p className="text-2xl font-bold">Ты теперь тренируешься</p>
                <p className="text-2xl font-bold text-yellow-400">с этим тренером</p>
              </div>

              <p className="text-sm text-gray-400">
                {trainer.name} уже знает о тебе
              </p>

              <div className="mt-2 w-full rounded-2xl border border-yellow-400/20 bg-yellow-400/5 px-5 py-4 text-left">
                {PERKS.slice(0, 4).map((p) => (
                  <p key={p} className="flex items-center gap-2 py-1 text-sm text-gray-300">
                    <span className="text-yellow-400">✔</span> {p}
                  </p>
                ))}
              </div>

              <Button variant="secondary" fullWidth onClick={goBack}>
                К тренеру
              </Button>
            </motion.div>

          /* ── Info ──────────────────────────────────────────────────── */
          ) : (
            <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

              {/* Price + slots */}
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
                    Ежемесячная подписка
                  </p>
                  <p className="mt-1 text-3xl font-bold">
                    {price.toLocaleString("ru-RU")}₽
                    <span className="ml-1 text-base font-normal text-gray-500">/ мес</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-yellow-400">
                    Осталось {remaining} мест
                  </p>
                  <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(subs / slots) * 100}%` }}
                      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full bg-yellow-400"
                    />
                  </div>
                </div>
              </div>

              {/* Perks */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                <p className="border-b border-white/[0.07] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Что входит
                </p>
                <ul className="divide-y divide-white/[0.05]">
                  {PERKS.map((perk, i) => (
                    <motion.li
                      key={perk}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-[11px] text-yellow-400">
                        ✔
                      </span>
                      <span className={`text-sm ${i === PERKS.length - 1 ? "text-gray-500" : "text-gray-200"}`}>
                        {perk}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Social proof */}
              <p className="mb-6 text-center text-xs text-gray-600">
                {subs} учеников уже тренируются с {trainer.name.split(" ")[0]}
              </p>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky CTA */}
      {screen === "info" ? (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.06] bg-black/95 p-4 backdrop-blur-md">
          {subscribed ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 py-3.5 font-semibold text-yellow-400">
              ✅ Ты в команде
            </div>
          ) : (
            <Button
              fullWidth
              size="lg"
              loading={paying}
              disabled={paying}
              onClick={handleSubscribe}
            >
              Подписаться · {price.toLocaleString("ru-RU")}₽/мес
            </Button>
          )}
          <p className="mt-2 text-center text-[10px] text-gray-600">
            Отменить можно в любой момент
          </p>
        </div>
      ) : null}
    </div>
  );
}
