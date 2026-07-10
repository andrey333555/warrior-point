"use client";

import { useEffect, useState } from "react";
import {
  STREAK_REWARDS,
  getStreakMultiplier,
  isStreakAlive,
  getStreakLossMessage,
  type StreakData,
} from "@/lib/loyalty";

type Props = {
  streak: StreakData;
  onBookSplit: () => void;
};

export default function StreakWidget({ streak, onBookSplit }: Props) {
  const alive = isStreakAlive(streak.lastSessionDate);
  const multiplier = getStreakMultiplier(streak.currentStreak);
  const [showRewards, setShowRewards] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(0);

  useEffect(() => {
    const last = new Date(streak.lastSessionDate);
    const deadline = new Date(last.getTime() + 48 * 60 * 60 * 1000);
    const update = () => {
      const diff = deadline.getTime() - Date.now();
      setHoursLeft(Math.max(0, Math.floor(diff / (1000 * 60 * 60))));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [streak.lastSessionDate]);

  const urgent = alive && hoursLeft <= 12;

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="p-4 pb-3"
        style={{
          background: alive
            ? urgent
              ? "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, transparent 100%)"
              : "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, transparent 100%)"
            : "linear-gradient(135deg, rgba(107,114,128,0.1) 0%, transparent 100%)",
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{alive ? "🔥" : "💀"}</span>
            <div>
              <p className="text-lg font-semibold text-white">
                {alive ? `${streak.currentStreak} дней` : "Streak потерян"}
              </p>
              <p className="text-xs text-white/40">
                Лучший: {streak.bestStreak} дней
              </p>
            </div>
          </div>

          {alive && multiplier > 1 && (
            <div
              className="rounded-xl px-3 py-1.5 text-center"
              style={{
                background: "rgba(201,168,76,0.15)",
                border: "0.5px solid rgba(201,168,76,0.3)",
              }}
            >
              <p className="text-xs font-bold" style={{ color: "#C9A84C" }}>
                x{multiplier}
              </p>
              <p className="text-white/30" style={{ fontSize: 9 }}>
                XP бонус
              </p>
            </div>
          )}
        </div>

        {alive && urgent && (
          <div
            className="mb-3 flex items-center gap-2 rounded-xl p-2.5"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "0.5px solid rgba(239,68,68,0.3)",
            }}
          >
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <p className="text-xs font-medium text-red-400">
              ⏰ Streak обнулится через {hoursLeft}ч! Запишись на сплит!
            </p>
          </div>
        )}

        {!alive && (
          <div
            className="mb-3 rounded-xl p-2.5"
            style={{
              background: "rgba(107,114,128,0.1)",
              border: "0.5px solid rgba(107,114,128,0.2)",
            }}
          >
            <p className="text-xs text-white/50">
              {getStreakLossMessage(streak.currentStreak)}
            </p>
          </div>
        )}

        <div className="mb-3 flex gap-1">
          {[3, 7, 14, 21, 30].map((day) => (
            <div key={day} className="flex-1">
              <div
                className="h-1 rounded-full"
                style={{
                  background:
                    streak.currentStreak >= day
                      ? "#C9A84C"
                      : "rgba(255,255,255,0.08)",
                  boxShadow:
                    streak.currentStreak >= day
                      ? "0 0 4px rgba(201,168,76,0.5)"
                      : "none",
                }}
              />
              <p
                className="mt-1 text-center"
                style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}
              >
                {day}д
              </p>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowRewards(!showRewards)}
        className="flex w-full items-center justify-between px-4 py-2.5"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-xs text-white/40">
          🎁 Награды за серию (
          {STREAK_REWARDS.filter((r) => streak.currentStreak >= r.days).length}/
          {STREAK_REWARDS.length})
        </span>
        <svg
          width="12"
          height="12"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          viewBox="0 0 24 24"
          style={{
            transform: showRewards ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {showRewards && (
        <div className="space-y-2 px-4 pb-4">
          {STREAK_REWARDS.map((reward) => {
            const unlocked = streak.currentStreak >= reward.days;
            return (
              <div
                key={reward.days}
                className="flex items-center gap-3 rounded-xl p-2.5"
                style={{
                  background: unlocked
                    ? "rgba(201,168,76,0.08)"
                    : "rgba(255,255,255,0.02)",
                  border: unlocked
                    ? "0.5px solid rgba(201,168,76,0.2)"
                    : "0.5px solid rgba(255,255,255,0.05)",
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <span className="text-lg">{reward.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white">
                    {reward.days} дней подряд
                  </p>
                  <p className="truncate text-xs text-white/40">
                    {reward.reward}
                  </p>
                </div>
                {unlocked ? (
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="#C9A84C"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onBookSplit}
          className="w-full rounded-xl py-3 text-sm font-medium transition-all"
          style={
            urgent
              ? {
                  background: "#ef4444",
                  color: "#fff",
                  boxShadow: "0 0 16px rgba(239,68,68,0.3)",
                }
              : { background: "#C9A84C", color: "#0A0A0A" }
          }
        >
          {urgent
            ? "🚨 Спасти streak — записаться!"
            : "🥊 Записаться на сплит"}
        </button>
      </div>
    </div>
  );
}
