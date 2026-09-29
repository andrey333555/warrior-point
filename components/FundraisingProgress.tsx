"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Heart, Users, Clock, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";

interface Donation {
  name: string;
  amount: number;
  isAnonymous?: boolean;
  timeAgo: string;
}

interface FundraisingProgressProps {
  title?: string;
  description?: string;
  goal?: number;
  raised?: number;
  supporters?: number;
  daysLeft?: number;
  recentDonations?: Donation[];
  quickAmounts?: number[];
  onSupport?: (amount: number) => void;
}

const DEFAULT_DONATIONS: Donation[] = [
  { name: "Иван П.", amount: 5000, timeAgo: "2 мин назад" },
  { name: "Аноним", amount: 500, isAnonymous: true, timeAgo: "15 мин назад" },
  { name: "Дмитрий К.", amount: 1000, timeAgo: "1 час назад" },
];

const DEFAULT_QUICK_AMOUNTS = [100, 500, 1000, 5000];

const UNFOLD = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1] as const,
};

export default function FundraisingProgress({
  title = "Сборы в Краснодар",
  description = "Подготовка к главному бою года",
  goal = 500000,
  raised = 127500,
  supporters = 43,
  daysLeft = 18,
  recentDonations = DEFAULT_DONATIONS,
  quickAmounts = DEFAULT_QUICK_AMOUNTS,
  onSupport,
}: FundraisingProgressProps) {
  const [expanded, setExpanded] = useState(false);
  const safeGoal = goal > 0 ? goal : 1;
  const percentage = Math.min(Math.round((raised / safeGoal) * 100), 100);
  const remaining = Math.max(goal - raised, 0);
  const daysElapsed = Math.max(30 - daysLeft, 1);
  const perDay = Math.round(raised / daysElapsed) || 0;

  const handleCta = () => {
    if (!expanded) {
      setExpanded(true);
      return;
    }
    onSupport?.(0);
  };

  return (
    <motion.div
      layout
      transition={{ layout: UNFOLD }}
      className={
        expanded
          ? "w-full overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-gray-900 via-gray-900 to-black p-5 shadow-lg shadow-yellow-400/10"
          : "w-full overflow-hidden rounded-xl"
      }
    >
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="fund-top"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={UNFOLD}
            className="overflow-hidden"
          >
            <div className="pb-4">
              <div className="mb-4 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Zap className="text-yellow-400" size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                      Активный сбор
                    </span>
                  </div>
                  <h3 className="text-lg font-bold leading-tight text-white">{title}</h3>
                  {description ? (
                    <p className="mt-1 text-sm text-gray-400">{description}</p>
                  ) : null}
                </div>
                <div className="ml-2 flex flex-shrink-0 items-center gap-1 rounded-full bg-orange-400/10 px-2 py-1 text-xs text-orange-400">
                  <Clock size={12} />
                  <span className="font-semibold">{daysLeft} дн.</span>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-bold text-white">
                      {raised.toLocaleString("ru-RU")}
                    </span>
                    <span className="ml-1 text-sm text-gray-500">₽</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-400">{percentage}%</span>
                </div>

                <div className="relative h-3 overflow-hidden rounded-full bg-gray-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                  >
                    <div className="absolute inset-0 animate-pulse bg-white/20" />
                  </motion.div>
                </div>

                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Цель: {goal.toLocaleString("ru-RU")} ₽</span>
                  <span>Осталось: {remaining.toLocaleString("ru-RU")} ₽</span>
                </div>
              </div>

              <div className="flex items-center gap-4 border-y border-gray-800 py-3">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-yellow-400" />
                  <span className="text-sm font-bold text-white">{supporters}</span>
                  <span className="text-xs text-gray-500">фанатов</span>
                </div>
                <div className="h-4 w-px bg-gray-800" />
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-green-400" />
                  <span className="text-sm font-bold text-green-400">
                    +{perDay.toLocaleString("ru-RU")}
                  </span>
                  <span className="text-xs text-gray-500">₽/день</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={handleCta}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 py-3.5 font-bold text-black shadow-lg transition-all hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-400/50 active:scale-[0.98]"
        >
          <Heart size={18} fill="currentColor" />
          <span>Поддержать бойца (СБП)</span>
          {expanded ? null : <ChevronDown size={18} />}
        </button>
        {expanded ? (
          <button
            type="button"
            aria-label="Свернуть сбор"
            onClick={() => setExpanded(false)}
            className="flex w-12 items-center justify-center rounded-xl border border-yellow-400/40 bg-yellow-400/10 text-yellow-400 transition-colors hover:bg-yellow-400/20"
          >
            <ChevronDown size={18} className="rotate-180" />
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="fund-bottom"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ...UNFOLD, delay: 0.04 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Быстрая поддержка
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => onSupport?.(amount)}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-sm font-semibold text-white transition-all hover:border-yellow-400/50 hover:bg-yellow-400/20 active:scale-95"
                    >
                      {amount >= 1000 ? `${amount / 1000}k` : amount} ₽
                    </button>
                  ))}
                </div>
              </div>

              {recentDonations.length > 0 ? (
                <div className="border-t border-gray-800 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Последние поддержки
                  </p>
                  <div className="space-y-2">
                    {recentDonations.slice(0, 3).map((donation, index) => (
                      <motion.div
                        key={`${donation.name}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + index * 0.08 }}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-yellow-400/30 bg-gradient-to-br from-yellow-400/20 to-yellow-600/10">
                            <span className="text-xs font-bold text-yellow-400">
                              {donation.isAnonymous ? "?" : donation.name[0]}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">
                              {donation.isAnonymous ? "Аноним" : donation.name}
                            </p>
                            <p className="text-xs text-gray-500">{donation.timeAgo}</p>
                          </div>
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold text-yellow-400">
                          +{donation.amount.toLocaleString("ru-RU")} ₽
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-center gap-4 border-t border-gray-800 pt-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span>🔒</span>
                  <span>СБП</span>
                </div>
                <span className="text-gray-700">·</span>
                <div className="flex items-center gap-1">
                  <span>✓</span>
                  <span>Верифицирован</span>
                </div>
                <span className="text-gray-700">·</span>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-gray-500 transition-colors hover:text-yellow-400"
                >
                  Свернуть
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
