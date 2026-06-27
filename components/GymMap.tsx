"use client";

import type { GymEntry } from "@/lib/gyms";

const EASE = "transition-all duration-300 ease-out";

type GymMapProps = {
  gym: GymEntry;
  hexColor: string;
};

export function GymMap({ gym, hexColor }: GymMapProps) {
  const mapsUrl = `https://www.google.com/maps?q=${gym.lat},${gym.lng}`;

  return (
    <section className="mt-4">
      <h3 className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.32em] text-neutral-500">
        Локация
      </h3>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2 block overflow-hidden rounded-xl border border-white/10 bg-black/40 ${EASE} hover:border-white/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]`}
      >
        <div className="relative h-[120px]">
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${hexColor}33, transparent 70%)`,
            }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/80 text-sm"
              style={{ boxShadow: `0 0 16px ${hexColor}` }}
            >
              📍
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] px-3 py-2.5">
          <p className="text-xs text-white/80">{gym.address}</p>
          <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.14em] text-neutral-500">
            {gym.city} · {gym.lat.toFixed(4)}, {gym.lng.toFixed(4)}
          </p>
          <p className="mt-1 text-[10px] font-medium text-purple-300/80">Открыть в картах →</p>
        </div>
      </a>
    </section>
  );
}
