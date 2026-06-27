"use client";

import type { FeaturedAthlete } from "@/lib/gyms";

const EASE = "transition-all duration-300 ease-out";

type GymFightersProps = {
  athletes: FeaturedAthlete[];
  hexColor: string;
};

function FighterCard({ athlete, hexColor }: { athlete: FeaturedAthlete; hexColor: string }) {
  return (
    <div
      className={`min-w-[160px] shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md ${EASE} hover:scale-[1.02] hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-white">{athlete.displayName}</p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider"
          style={{
            color: hexColor,
            background: `${hexColor}18`,
            border: `1px solid ${hexColor}44`,
          }}
        >
          {athlete.status}
        </span>
      </div>
      <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.1em] text-neutral-500">
        {athlete.label}
      </p>
      {athlete.promotions ? (
        <p className="mt-1.5 text-[10px] leading-snug text-white/50">{athlete.promotions}</p>
      ) : null}
    </div>
  );
}

export function GymFighters({ athletes, hexColor }: GymFightersProps) {
  const fighters = athletes.filter((a) => !/coach|тренер/i.test(a.status));

  if (fighters.length === 0) return null;

  return (
    <section className="mt-4">
      <h3 className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.32em] text-neutral-500">
        Бойцы
      </h3>
      <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {fighters.map((a) => (
          <FighterCard key={a.profileId} athlete={a} hexColor={hexColor} />
        ))}
      </div>
    </section>
  );
}
