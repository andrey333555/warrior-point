"use client";

import { useState } from "react";
import { RoundProgress, RoundBadge, RoundMini } from "@/components/RoundProgress";
import { canAccessTrainer } from "@/lib/levels";

const DEMO_TRAINERS = [
  { id: "1", name: "Иван Дроздов", minRound: 1, price: 1500, tag: "Ударка" },
  { id: "2", name: "Артём Волков", minRound: 5, price: 2000, tag: "MMA" },
  { id: "3", name: "Ислам Махачев", minRound: 10, price: 3000, tag: "BJJ" },
  { id: "4", name: "Хабиб Нурмагомедов", minRound: 16, price: 5000, tag: "Борьба" },
  { id: "5", name: "Конор Макгрегор", minRound: 21, price: 10000, tag: "Страйкинг" },
];

const MAX_DEMO_XP = 2_865_700;

export default function LevelsDemo() {
  const [xp, setXp] = useState(340);

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
            🎮 Демо — перетащи чтобы увидеть разные раунды
          </p>
          <input
            type="range"
            min={0}
            max={MAX_DEMO_XP}
            step={100}
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            className="w-full accent-yellow-400"
          />
          <div
            className="mt-1 flex justify-between text-xs"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span>0 XP · R1</span>
            <span>{xp.toLocaleString("ru-RU")} XP</span>
            <span>2.8M XP · R23</span>
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
    </div>
  );
}
