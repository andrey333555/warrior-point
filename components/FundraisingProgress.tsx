"use client";

import { motion } from "framer-motion";
import { Heart, Clock, Zap } from "lucide-react";

export type FundraisingRecentDonation = {
  name: string;
  amount: number;
  isAnonymous?: boolean;
  timeAgo: string;
};

interface FundraisingProgressProps {
  title: string;
  description?: string | null;
  goal: number;
  raised: number;
  /** Active campaign from DB — shows title/goal/progress/deadline */
  hasCampaign?: boolean;
  /** null/undefined — do not show deadline badge */
  daysLeft?: number | null;
  recentDonations?: FundraisingRecentDonation[];
  /**
   * PAYMENTS_PROVIDER=yookassa → true: gold CTA opens donate sheet.
   * manual/unset → false: «Донаты откроются скоро», no sheet.
   */
  donationsEnabled?: boolean;
  onSupport?: (amount: number) => void;
}

/**
 * Compact fundraising CTA.
 * Manual payments: sealed button. Live YooKassa: opens donate sheet.
 */
export default function FundraisingProgress({
  title,
  description,
  goal,
  raised,
  hasCampaign = false,
  daysLeft = null,
  donationsEnabled = false,
  onSupport,
}: FundraisingProgressProps) {
  const showCampaignDetails = hasCampaign && goal > 0;
  const safeGoal = goal > 0 ? goal : 1;
  const percentage = Math.min(Math.round((raised / safeGoal) * 100), 100);
  const remaining = Math.max(goal - raised, 0);
  const showDeadline =
    showCampaignDetails && daysLeft !== null && daysLeft !== undefined;

  return (
    <div
      className={
        showCampaignDetails
          ? "w-full overflow-hidden rounded-2xl border border-[#C9A84C]/30 bg-gradient-to-br from-gray-900 via-gray-900 to-black p-5 shadow-lg shadow-[#C9A84C]/10"
          : "w-full overflow-hidden rounded-xl"
      }
    >
      {showCampaignDetails ? (
        <div className="pb-4">
          <div className="mb-4 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Zap className="text-[#C9A84C]" size={16} />
                <span className="text-xs font-bold uppercase tracking-wider text-[#C9A84C]">
                  Активный сбор
                </span>
              </div>
              <h3 className="text-lg font-bold leading-tight text-white">{title}</h3>
              {description ? (
                <p className="mt-1 line-clamp-3 text-sm text-gray-400">
                  {description}
                </p>
              ) : null}
            </div>
            {showDeadline ? (
              <div className="ml-2 flex flex-shrink-0 items-center gap-1 rounded-full bg-orange-400/10 px-2 py-1 text-xs text-orange-400">
                <Clock size={12} />
                <span className="font-semibold">Осталось {daysLeft} дн.</span>
              </div>
            ) : null}
          </div>

          <div className="mb-1">
            <div className="mb-2 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold text-white">
                  {raised.toLocaleString("ru-RU")}
                </span>
                <span className="ml-1 text-sm text-gray-500">₽</span>
              </div>
              <span className="text-lg font-bold text-[#C9A84C]">{percentage}%</span>
            </div>

            <div className="relative h-3 overflow-hidden rounded-full bg-gray-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-yellow-500"
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Цель: {goal.toLocaleString("ru-RU")} ₽</span>
              <span>Осталось: {remaining.toLocaleString("ru-RU")} ₽</span>
            </div>

            {raised === 0 ? (
              <p className="mt-2 text-sm font-medium text-[#C9A84C]/90">
                Будь первым
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {donationsEnabled ? (
        <button
          type="button"
          onClick={() => onSupport?.(0)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C9A84C] to-yellow-500 py-3.5 font-bold text-[#0A0A0A] shadow-lg transition-all hover:from-yellow-500 hover:to-[#C9A84C] hover:shadow-[#C9A84C]/40 active:scale-[0.98]"
        >
          <Heart size={18} fill="currentColor" />
          <span>Поддержать бойца</span>
        </button>
      ) : (
        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-3.5 text-sm font-semibold text-white/55">
          Донаты откроются скоро
        </div>
      )}
    </div>
  );
}
