import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { fetchLeaderboardTopTen } from "@/lib/supabase/read";
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
  const rows =
    cfg == null
      ? []
      : await fetchLeaderboardTopTen(createClient(cfg.url, cfg.anonKey));

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

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-md">
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
              rows.map((row) => (
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
                  </span>
                  <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-cyan-300 sm:text-sm">
                    {fmtXp.format(row.totalXp)}
                  </span>
                  <span className="text-right font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-zinc-400 sm:text-sm">
                    {row.workoutCount}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
