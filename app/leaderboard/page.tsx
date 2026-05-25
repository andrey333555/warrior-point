import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import {
  fetchLeaderboardTopTen,
  fetchMonthlyXpLeaderboard,
} from "@/lib/supabase/read";
import { getWarriorPublicSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Leaderboard · Warrior Point",
  description: "Top combatants · global XP standings",
};

export const dynamic = "force-dynamic";

const fmtXp = new Intl.NumberFormat("en-US", {
  notation: "standard",
  maximumFractionDigits: 0,
});

export default async function LeaderboardPage() {
  const cfg = getWarriorPublicSupabaseEnv();

  const [rows, monthly] =
    cfg == null
      ? [[], []]
      : await Promise.all([
          fetchLeaderboardTopTen(createClient(cfg.url, cfg.anonKey)),
          fetchMonthlyXpLeaderboard(createClient(cfg.url, cfg.anonKey), {
            days: 30,
            limit: 10,
          }),
        ]);

  return (
    <div className="min-h-screen bg-black pb-28 text-zinc-100 font-sans selection:bg-fuchsia-500/25 selection:text-fuchsia-50 sm:pb-32">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(244,63,246,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "52px 52px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-fuchsia-500/[0.05] via-transparent to-cyan-500/[0.06]" />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="border-b border-white/[0.1] pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-fuchsia-300/95">
            Global ladder
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Leaderboard · Top 10
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Sovereign XP registry · audited training volume
          </p>
          {cfg == null ? (
            <p
              role="status"
              className="mt-4 rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-[11px] uppercase tracking-[0.15em] text-amber-200"
            >
              Supabase keys missing · set NEXT_PUBLIC_* in `.env.local`
            </p>
          ) : null}
        </header>

        <section className="mt-10 overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-md">
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_5.75rem] gap-2 border-b border-cyan-500/20 bg-black/50 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400/95 sm:grid-cols-[3rem_minmax(0,1fr)_7rem_8rem] sm:gap-4 sm:px-4 sm:text-[11px]">
            <span>Ранг</span>
            <span>Имя</span>
            <span className="text-right">ХР</span>
            <span className="text-right whitespace-nowrap">Трен‑ки</span>
          </div>

          <ul className="divide-y divide-white/[0.06]">
            {rows.length === 0 ? (
              <li className="px-4 py-10 text-center font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.25em] text-zinc-600">
                {cfg == null
                  ? "Нет конфигурации · ленты пусты"
                  : "Пока нет записей в fighter_stats · отметь сеанс"}
              </li>
            ) : (
              rows.map((row) => {
                const isWinner = row.isWinner;

                return (
                  <li
                    key={row.fighterSlug}
                    className="grid grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_5.75rem] items-center gap-2 px-3 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_7rem_8rem] sm:gap-4 sm:px-4 sm:py-3.5"
                  >
                    <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-fuchsia-200/95 sm:text-sm">
                      #{row.rank}
                    </span>
                    <span className="min-w-0 truncate font-medium text-zinc-200 sm:text-[15px]">
                      <span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.08em]">
                        {row.displayName}
                      </span>
                      {isWinner ? (
                        <span
                          className="ml-2 inline-flex items-center rounded-full border border-amber-400/55 bg-amber-500/[0.12] px-2 py-[1px] font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-200"
                          title="Winner of the Month"
                        >
                          ★ Winner
                        </span>
                      ) : null}
                    </span>
                    <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-cyan-300 sm:text-sm">
                      {fmtXp.format(row.totalXp)}
                    </span>
                    <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-zinc-400 sm:text-sm">
                      {row.workoutCount}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-3 border-b border-amber-400/25 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-amber-300/95">
                30-Day Surge
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-semibold tracking-tight text-white sm:text-xl">
                Gift candidates · XP за 30 дней
              </h2>
            </div>
            <span
              aria-hidden
              className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-zinc-500"
            >
              window · last 30d
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-amber-400/20 bg-zinc-950/70 shadow-[inset_0_0_0_1px_rgba(250,204,21,0.06)] backdrop-blur-md">
            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_5.75rem] gap-2 border-b border-amber-400/15 bg-black/50 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/95 sm:grid-cols-[3rem_minmax(0,1fr)_7rem_8rem] sm:gap-4 sm:px-4 sm:text-[11px]">
              <span>Ранг</span>
              <span>Имя</span>
              <span className="text-right">XP · 30d</span>
              <span className="text-right whitespace-nowrap">Сеансы</span>
            </div>

            <ul className="divide-y divide-white/[0.05]">
              {monthly.length === 0 ? (
                <li className="px-4 py-10 text-center font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.25em] text-zinc-600">
                  Пока нет сессий в окне 30 дней
                </li>
              ) : (
                monthly.map((row) => {
                  const isWinner = row.isWinner;

                  return (
                    <li
                      key={row.fighterSlug}
                      className="grid grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_5.75rem] items-center gap-2 px-3 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_7rem_8rem] sm:gap-4 sm:px-4 sm:py-3.5"
                    >
                      <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-amber-200/95 sm:text-sm">
                        #{row.rank}
                      </span>
                      <span className="min-w-0 truncate font-medium text-zinc-200 sm:text-[15px]">
                        <span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.08em]">
                          {row.displayName}
                        </span>
                        {isWinner ? (
                          <span className="ml-2 inline-flex items-center rounded-full border border-amber-400/55 bg-amber-500/[0.12] px-2 py-[1px] font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                            ★ Winner
                          </span>
                        ) : null}
                      </span>
                      <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-amber-200 sm:text-sm">
                        {fmtXp.format(row.xp30d)}
                      </span>
                      <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-zinc-400 sm:text-sm">
                        {row.sessions30d}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-[11px] leading-relaxed text-zinc-500">
            Источник: SUM(<span className="text-zinc-300">xp_awarded</span>)
            по <span className="text-zinc-300">training_sessions</span> с{" "}
            <span className="text-zinc-300">created_at ≥ now() − 30d</span>.
            Этот срез — кандидаты на gold-toggle «Winner of the Month»
            в Warrior Passport.
          </p>
        </section>
      </main>
    </div>
  );
}
