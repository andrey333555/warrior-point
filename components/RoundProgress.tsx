"use client";

import { useState } from "react";
import {
  getRoundByXP,
  getRoundProgress,
  getXPToNext,
  ROUNDS,
  XP_SOURCES,
} from "@/lib/levels";

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function RoundBadge({
  xp,
  size = "md",
}: {
  xp: number;
  size?: "sm" | "md" | "lg";
}) {
  const round = getRoundByXP(xp);
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizes[size]}`}
      style={{
        background: `rgba(${hexToRgb(round.color)}, 0.15)`,
        border: `0.5px solid ${round.color}`,
        color: round.color,
        boxShadow: `0 0 8px ${round.glowColor}`,
      }}
    >
      R{round.round} · {round.label}
    </span>
  );
}

export function RoundProgress({
  xp,
  showSources = false,
}: {
  xp: number;
  showSources?: boolean;
}) {
  const round = getRoundByXP(xp);
  const progress = getRoundProgress(xp);
  const toNext = getXPToNext(xp);
  const [tab, setTab] = useState<"progress" | "sources">("progress");

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
          background: `linear-gradient(135deg, rgba(${hexToRgb(round.color)},0.1) 0%, transparent 100%)`,
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color: round.color }}>
                Раунд {round.round}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: `rgba(${hexToRgb(round.color)},0.15)`,
                  color: round.color,
                }}
              >
                {round.tier}
              </span>
            </div>
            <p className="text-sm text-white/40">{round.label}</p>
          </div>

          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg width="56" height="56" viewBox="0 0 56 56" className="absolute">
              <polygon
                points="28,4 50,16 50,40 28,52 6,40 6,16"
                fill="none"
                stroke={`rgba(${hexToRgb(round.color)},0.2)`}
                strokeWidth="1.5"
              />
              <polygon
                points="28,4 50,16 50,40 28,52 6,40 6,16"
                fill="none"
                stroke={round.color}
                strokeWidth="1.5"
                strokeDasharray={`${progress * 1.52} 152`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${round.color})` }}
              />
            </svg>
            <span className="relative z-10 text-lg font-bold text-white">{round.round}</span>
          </div>
        </div>

        <div className="mb-2">
          <div className="mb-1.5 flex justify-between text-xs">
            <span style={{ color: "rgba(255,255,255,0.4)" }}>
              {xp.toLocaleString("ru-RU")} XP
            </span>
            {round.round < 23 ? (
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                ещё {toNext.toLocaleString("ru-RU")} XP → Раунд {round.round + 1}
              </span>
            ) : null}
          </div>
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${round.color}88, ${round.color})`,
                boxShadow: `0 0 8px ${round.glowColor}`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span style={{ color: "rgba(255,255,255,0.2)" }}>Раунд {round.round}</span>
            {round.round < 23 ? (
              <span style={{ color: "rgba(255,255,255,0.2)" }}>
                Раунд {round.round + 1}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="px-4 py-3"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
      >
        <p className="mb-1.5 text-xs uppercase tracking-wider text-white/30">
          Открыто на этом уровне
        </p>
        <p className="text-sm text-white/70">{round.unlocksLabel}</p>
      </div>

      {showSources ? (
        <>
          <div
            className="flex gap-2 px-4 pb-0"
            style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
          >
            {(["progress", "sources"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="py-2.5 text-xs font-medium transition-colors"
                style={{
                  color: tab === t ? "#C9A84C" : "rgba(255,255,255,0.3)",
                  borderBottom:
                    tab === t ? "1px solid #C9A84C" : "1px solid transparent",
                }}
              >
                {t === "progress" ? "Прогресс" : "Как заработать XP"}
              </button>
            ))}
          </div>

          {tab === "sources" ? (
            <div className="space-y-2 px-4 pb-4 pt-3">
              {XP_SOURCES.map((s) => (
                <div key={s.action} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <span className="text-sm text-white/60">{s.action}</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#C9A84C" }}>
                    +{s.xp} XP
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "progress" ? (
            <div className="px-4 pb-4 pt-3">
              <RoundRoadmap currentRound={round.round} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function RoundRoadmap({ currentRound }: { currentRound: number }) {
  const tiers = [
    { tier: "Новичок", rounds: [1, 2, 3, 4, 5], color: "#6b7280" },
    { tier: "Боец", rounds: [6, 7, 8, 9, 10], color: "#3b82f6" },
    { tier: "Ветеран", rounds: [11, 12, 13, 14, 15], color: "#8b5cf6" },
    { tier: "Элита", rounds: [16, 17, 18, 19, 20], color: "#C9A84C" },
    { tier: "Легенда", rounds: [21, 22, 23], color: "#ef4444" },
  ];

  return (
    <div className="space-y-3">
      {tiers.map(({ tier, rounds, color }) => (
        <div key={tier}>
          <p className="mb-1.5 text-xs font-medium" style={{ color }}>
            {tier}
          </p>
          <div className="flex gap-1.5">
            {rounds.map((r) => {
              const done = r < currentRound;
              const active = r === currentRound;

              return (
                <div
                  key={r}
                  className="flex h-7 flex-1 items-center justify-center rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: done
                      ? `rgba(${hexToRgb(color)},0.3)`
                      : active
                        ? color
                        : "rgba(255,255,255,0.04)",
                    color: done ? color : active ? "#0A0A0A" : "rgba(255,255,255,0.2)",
                    border:
                      active
                        ? "none"
                        : `0.5px solid rgba(${hexToRgb(color)},${done ? "0.3" : "0.1"})`,
                    boxShadow: active ? `0 0 10px ${color}66` : "none",
                  }}
                >
                  {r}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RoundMini({ xp }: { xp: number }) {
  const round = getRoundByXP(xp);
  const progress = getRoundProgress(xp);

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: round.color,
          color: "#0A0A0A",
          boxShadow: `0 0 6px ${round.glowColor}`,
        }}
      >
        {round.round}
      </div>
      <div className="flex-1" style={{ minWidth: 60 }}>
        <div
          className="h-1 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: round.color }}
          />
        </div>
      </div>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        {xp.toLocaleString("ru-RU")} XP
      </span>
    </div>
  );
}
