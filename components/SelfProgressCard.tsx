"use client";

import {
  getMotivation,
  getActivityLevel,
  getStreakMotivation,
  getEloMotivation,
  getNextLevelHint,
  ACTIVITY_LEVELS,
  type MonthActivity,
} from "@/lib/motivation";

type Props = {
  activity: MonthActivity;
};

export default function SelfProgressCard({ activity }: Props) {
  const motivation = getMotivation(activity);
  const level = getActivityLevel(activity.sessions);
  const streakMsg = getStreakMotivation(activity.streakDays);
  const eloMsg = getEloMotivation(activity.eloChange);
  const nextHint = getNextLevelHint(activity.sessions);

  const toneColors = {
    fire: "#ef4444",
    proud: "#C9A84C",
    push: "#3b82f6",
    calm: "#22c55e",
  };
  const accent = toneColors[motivation.tone];

  return (
    <div
      className="mx-5 overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Motivation + level — один блок */}
      <div
        className="px-4 py-4"
        style={{ background: `linear-gradient(135deg, ${accent}18 0%, transparent 100%)` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <span className="text-2xl leading-none">{motivation.emoji}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold leading-tight text-white">
                  {motivation.headline}
                </h3>
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    borderColor: `${level.color}44`,
                    color: level.color,
                    background: `${level.color}14`,
                  }}
                >
                  {level.emoji} {level.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/35">
                {activity.sessions} тренировок в этом месяце
              </p>
              <p className="mt-1.5 text-sm leading-snug text-white/50">
                {motivation.message}
              </p>
            </div>
          </div>
          <p
            className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-2xl font-bold tabular-nums"
            style={{ color: level.color }}
          >
            {activity.sessions}
          </p>
        </div>

        <div className="mt-3 flex gap-1">
          {[6, 8, 10, 12].map((threshold, i) => {
            const lvl = ACTIVITY_LEVELS[i] ?? ACTIVITY_LEVELS[ACTIVITY_LEVELS.length - 1]!;
            const minSessions = ACTIVITY_LEVELS[i]?.minSessions ?? threshold;
            const filled =
              i === 0
                ? activity.sessions >= 1
                : activity.sessions >= minSessions;

            return (
              <div key={threshold} className="flex-1">
                <div
                  className="h-1 rounded-full"
                  style={{
                    background: filled ? lvl.color : "rgba(255,255,255,0.08)",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div
          className="mt-1 flex justify-between text-[10px]"
          style={{ color: "rgba(255,255,255,0.22)" }}
        >
          <span>6 норма</span>
          <span>8 хорошо</span>
          <span>10+ отлично</span>
        </div>

        {nextHint ? (
          <p className="mt-2 text-xs" style={{ color: accent }}>
            Ещё {nextHint.needed}{" "}
            {nextHint.needed === 1 ? "тренировка" : "тренировки"} до «
            {nextHint.nextLabel}»
          </p>
        ) : null}
      </div>

      <div
        className="px-4 py-3"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
      >
        <p className="mb-2 text-[10px] uppercase tracking-wider text-white/30">
          Ты vs прошлый месяц
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <p className="text-[10px] text-white/30">Было</p>
            <p className="text-base font-medium text-white/50">
              {activity.prevMonthSessions}
            </p>
          </div>
          <div className="text-center">
            <svg
              width="18"
              height="18"
              fill="none"
              stroke={accent}
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
              />
            </svg>
          </div>
          <div className="flex-1 text-center">
            <p className="text-[10px] text-white/30">Стало</p>
            <p className="text-base font-bold" style={{ color: accent }}>
              {activity.sessions}
            </p>
          </div>
        </div>
        {activity.sessions > activity.prevMonthSessions ? (
          <p className="mt-2 text-center text-[11px]" style={{ color: "#22c55e" }}>
            🎉 +{activity.sessions - activity.prevMonthSessions} — ты стал лучше,
            чем вчера!
          </p>
        ) : null}
      </div>

      {streakMsg || eloMsg ? (
        <div
          className="space-y-1 px-4 py-2.5"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
        >
          {streakMsg ? <p className="text-[11px] text-white/55">{streakMsg}</p> : null}
          {eloMsg ? <p className="text-[11px] text-white/55">{eloMsg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
