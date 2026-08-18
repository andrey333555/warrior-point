"use client";

import { useMemo, useState } from "react";
import { RoundProgress, RoundBadge, RoundMini } from "@/components/RoundProgress";
import { canAccessTrainer, getRoundByXP, ROUNDS } from "@/lib/levels";

const DEMO_TRAINERS = [
  { id: "1", name: "Иван Дроздов", minRound: 1, price: 1500, tag: "Ударка" },
  { id: "2", name: "Артём Волков", minRound: 5, price: 2000, tag: "MMA" },
  { id: "3", name: "Ислам Махачев", minRound: 10, price: 3000, tag: "BJJ" },
  { id: "4", name: "Хабиб Нурмагомедов", minRound: 16, price: 5000, tag: "Борьба" },
  { id: "5", name: "Конор Макгрегор", minRound: 21, price: 10000, tag: "Страйкинг" },
];

/** Slider unit = one round. Fractional part = progress inside the round. */
const SLIDER_MIN = 1;
const SLIDER_MAX = 23;
const SLIDER_STEP = 0.05;

function xpFromSlider(value: number): number {
  const clamped = Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, value));
  const roundNum = Math.min(23, Math.floor(clamped));
  const frac = Math.min(1, Math.max(0, clamped - roundNum));
  const round = ROUNDS[roundNum - 1]!;

  if (round.round === 23 || round.xpToNext <= 0) {
    return round.xpRequired;
  }

  // Keep a bit of room before the next threshold so the badge stays on this round.
  const span = Math.max(0, round.xpToNext - 1);
  return round.xpRequired + Math.round(frac * span);
}

function sliderFromXp(xp: number): number {
  const current = getRoundByXP(xp);
  if (current.round === 23 || current.xpToNext <= 0) return 23;

  const earned = Math.max(0, xp - current.xpRequired);
  const frac = Math.min(1, earned / current.xpToNext);
  return current.round + frac;
}

export default function LevelsDemo() {
  const [slider, setSlider] = useState(() => sliderFromXp(340));
  const xp = useMemo(() => xpFromSlider(slider), [slider]);
  const round = getRoundByXP(xp);

  return (
    <div className="min-h-screen pb-10" style={{ background: "#0A0A0A" }}>
      <div
        className="px-4 pb-4 pt-12"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <polygon
                points="14,2 26,8 26,20 14,26 2,20 2,8"
                stroke="#C9A84C"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
            <span className="text-sm font-medium tracking-widest text-white">ROUND 23</span>
          </div>
          <RoundBadge xp={xp} />
        </div>
        <RoundMini xp={xp} />
      </div>

      <div className="space-y-5 px-4 pt-5">
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
            Демо — тяни бегунок по раундам
          </p>

          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
            aria-label="Раунд"
            aria-valuemin={SLIDER_MIN}
            aria-valuemax={SLIDER_MAX}
            aria-valuenow={Math.round(slider * 100) / 100}
            aria-valuetext={`Раунд ${round.round}`}
            className="levels-demo-slider w-full"
          />

          <div
            className="mt-2 flex justify-between text-xs"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span>R1</span>
            <span className="text-white/60">
              R{round.round} · {xp.toLocaleString("ru-RU")} XP
            </span>
            <span>R23</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[1, 5, 10, 16, 21, 23].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSlider(r)}
                className="rounded-full px-2.5 py-1 text-[11px] transition-colors"
                style={{
                  background:
                    round.round === r
                      ? "rgba(201,168,76,0.2)"
                      : "rgba(255,255,255,0.04)",
                  color: round.round === r ? "#C9A84C" : "rgba(255,255,255,0.45)",
                  border:
                    round.round === r
                      ? "0.5px solid rgba(201,168,76,0.45)"
                      : "0.5px solid rgba(255,255,255,0.08)",
                }}
              >
                R{r}
              </button>
            ))}
          </div>
        </div>

        <RoundProgress xp={xp} showSources />

        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
            Доступ к тренерам
          </p>
          <div className="space-y-2">
            {DEMO_TRAINERS.map((t) => {
              const access = canAccessTrainer(xp, t.minRound);

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl p-3.5"
                  style={{
                    background: access
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(255,255,255,0.02)",
                    border: access
                      ? "0.5px solid rgba(255,255,255,0.1)"
                      : "0.5px solid rgba(255,255,255,0.04)",
                    opacity: access ? 1 : 0.5,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm"
                      style={{
                        background: access
                          ? "rgba(201,168,76,0.15)"
                          : "rgba(255,255,255,0.05)",
                      }}
                    >
                      {access ? "🥊" : "🔒"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-white/40">
                        {t.tag} · от Раунда {t.minRound}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {access ? (
                      <span className="text-sm font-medium text-white">
                        {t.price.toLocaleString("ru-RU")} ₽
                      </span>
                    ) : (
                      <span
                        className="rounded-full px-2 py-1 text-xs"
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          color: "#ef4444",
                        }}
                      >
                        R{t.minRound}+
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .levels-demo-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 28px;
          background: transparent;
          cursor: pointer;
          touch-action: none;
        }
        .levels-demo-slider:focus {
          outline: none;
        }
        .levels-demo-slider:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.35);
        }
        .levels-demo-slider::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(107, 114, 128, 0.55) 0%,
            rgba(59, 130, 246, 0.55) 25%,
            rgba(139, 92, 246, 0.55) 50%,
            rgba(201, 168, 76, 0.7) 75%,
            rgba(239, 68, 68, 0.7) 100%
          );
        }
        .levels-demo-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          margin-top: -7px;
          border-radius: 50%;
          background: #c9a84c;
          border: 2px solid #0a0a0a;
          box-shadow: 0 0 10px rgba(201, 168, 76, 0.45);
        }
        .levels-demo-slider::-moz-range-track {
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(107, 114, 128, 0.55) 0%,
            rgba(59, 130, 246, 0.55) 25%,
            rgba(139, 92, 246, 0.55) 50%,
            rgba(201, 168, 76, 0.7) 75%,
            rgba(239, 68, 68, 0.7) 100%
          );
        }
        .levels-demo-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #c9a84c;
          border: 2px solid #0a0a0a;
          box-shadow: 0 0 10px rgba(201, 168, 76, 0.45);
        }
      `}</style>
    </div>
  );
}
