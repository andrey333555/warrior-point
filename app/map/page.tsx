/**
 * /map — Warrior Point · Cyber-Loft Interactive Map of Krasnodar Network
 *
 * Leaflet is loaded client-side only via CyberMapLoader
 * (dynamic + ssr:false must live inside a Client Component in Next.js 16).
 */

import type { Metadata } from "next";
import {
  ACTIVE_GYMS,
  PENDING_SLOTS,
  CATEGORY_LABELS,
  CATEGORY_ACCENT_HEX,
  GYM_ACCENT_HEX,
  NETWORK_LABELS,
  type GymCategory,
} from "@/lib/gyms";
import CyberMapLoader from "@/components/cyber-map-loader";

export const metadata: Metadata = {
  title: "Warrior Network Map · Краснодарский край",
  description:
    "Интерактивная карта залов Warrior Point: Кузня, бойцовские клубы, борцовские залы — Краснодар, Анапа, Новороссийск, Армавир.",
};

const CATEGORY_ROWS: { cat: GymCategory; suffix?: string }[] = [
  { cat: "kuznya" },
  { cat: "fight_club" },
  { cat: "wrestling" },
];

export default function MapPage() {
  const totalActive = ACTIVE_GYMS.length;

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 pb-20">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-white/[0.06] bg-black/80 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400"
            style={{ boxShadow: "0 0 10px 2px rgba(34,211,238,0.7)" }}
          />
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.4em] text-cyan-300/90">
              Warrior Point · Кибер-Карта
            </p>
            <h1 className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold uppercase tracking-[0.15em] text-white sm:text-lg">
              Сеть залов · Краснодарский край
            </h1>
          </div>

          {/* Category counts */}
          <div className="ml-auto flex flex-wrap gap-2">
            {CATEGORY_ROWS.map(({ cat }) => {
              const count = ACTIVE_GYMS.filter((g) => g.category === cat).length;
              const hex   = CATEGORY_ACCENT_HEX[cat];
              return (
                <span
                  key={cat}
                  className="rounded-full border px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.2em]"
                  style={{
                    borderColor: `${hex}50`,
                    background: `${hex}10`,
                    color: hex,
                  }}
                >
                  {CATEGORY_LABELS[cat]} · {count}
                </span>
              );
            })}
            <span className="rounded-full border border-zinc-700/60 bg-zinc-800/40 px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.2em] text-zinc-400">
              Всего · {totalActive}
            </span>
          </div>
        </div>
      </header>

      {/* ── Map ───────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto mt-4 w-full max-w-5xl grow px-3 sm:px-5">
        <div
          className="overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900"
          style={{ height: "calc(100svh - 220px)", minHeight: 420 }}
        >
          <CyberMapLoader />
        </div>
      </section>

      {/* ── Legend footer ─────────────────────────────────────────────────── */}
      <footer className="mx-auto mt-4 w-full max-w-5xl space-y-2 px-3 pb-3 sm:px-5">

        {/* Active gyms by category */}
        {CATEGORY_ROWS.map(({ cat }) => {
          const gyms = ACTIVE_GYMS.filter((g) => g.category === cat);
          const hex  = CATEGORY_ACCENT_HEX[cat];
          return (
            <div
              key={cat}
              className="rounded-2xl border border-white/[0.05] bg-black/60 px-4 py-3 backdrop-blur-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: hex, boxShadow: `0 0 8px 2px ${hex}` }}
                />
                <span
                  className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: hex }}
                >
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                  {gyms.length} объектов
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {gyms.map((gym) => (
                  <span
                    key={gym.id}
                    className="font-[family-name:var(--font-geist-mono)] text-[9.5px] uppercase tracking-[0.12em] text-zinc-500"
                  >
                    {gym.city === "Краснодар" || gym.city.startsWith("пос.")
                      ? gym.name
                      : `${gym.city} · ${gym.name}`}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Partner slots */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.04] bg-black/40 px-4 py-2.5 backdrop-blur-md">
          <p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.3em] text-zinc-700">
            Партнёры (скоро):
          </p>
          {PENDING_SLOTS.map((slot) => {
            const hex = GYM_ACCENT_HEX[slot.accent];
            return (
              <div key={slot.id} className="flex items-center gap-1.5 opacity-40">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: hex }}
                />
                <span className="font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                  {NETWORK_LABELS[slot.network]}
                </span>
              </div>
            );
          })}
        </div>

      </footer>
    </main>
  );
}
