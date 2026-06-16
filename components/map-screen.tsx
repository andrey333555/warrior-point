"use client";

/**
 * MapScreen — authenticated client shell for /map (Tactical OS mobile frame).
 */

import { useState } from "react";
import Link from "next/link";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { AuthGate } from "@/components/auth-gate";
import CyberMapLoader from "@/components/cyber-map-loader";
import { ACTIVE_GYMS, CATEGORY_LABELS, CATEGORY_ACCENT_HEX, type GymCategory } from "@/lib/gyms";

const CATEGORY_ROWS: { cat: GymCategory }[] = [
  { cat: "kuznya" },
  { cat: "fight_club" },
  { cat: "wrestling" },
];

export default function MapScreen() {
  const auth = useWarriorAuth();
  const [bookEcho, setBookEcho] = useState<string | null>(null);

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.3em] text-cyan-400/70">
          Загрузка карты…
        </p>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return <AuthGate />;
  }

  const clientId = auth.user.id;

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-black">
      {/* Desktop ambient */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[100px]" />
      </div>

      <div className="relative flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden border-x border-white/[0.06] bg-zinc-950 shadow-[0_0_80px_-20px_rgba(0,240,255,0.15)]">
        {/* Header */}
        <header className="shrink-0 border-b border-white/[0.06] bg-black/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-cyan-400"
              style={{ boxShadow: "0 0 10px 2px rgba(34,211,238,0.7)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] font-semibold uppercase tracking-[0.36em] text-cyan-300/80">
                Warrior Network · MAP
              </p>
              <h1 className="truncate font-[family-name:var(--font-geist-sans)] text-sm font-semibold tracking-tight text-white">
                Сплиты · {ACTIVE_GYMS.length} залов
              </h1>
            </div>
            <Link
              href="/"
              className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[8px] uppercase tracking-[0.16em] text-zinc-500 hover:text-cyan-300"
            >
              ← OS
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORY_ROWS.map(({ cat }) => {
              const count = ACTIVE_GYMS.filter((g) => g.category === cat).length;
              const hex = CATEGORY_ACCENT_HEX[cat];
              return (
                <span
                  key={cat}
                  className="rounded-full border px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[7.5px] uppercase tracking-[0.14em]"
                  style={{ borderColor: `${hex}44`, color: hex }}
                >
                  {CATEGORY_LABELS[cat]} · {count}
                </span>
              );
            })}
          </div>
        </header>

        {/* Map */}
        <div className="relative min-h-0 flex-1">
          <CyberMapLoader clientId={clientId} onBooked={setBookEcho} />
        </div>

        {/* Booking echo */}
        {bookEcho ? (
          <div className="pointer-events-none absolute bottom-20 left-1/2 z-[1200] -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-400/35 bg-black/90 px-4 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-200 backdrop-blur-md">
            {bookEcho}
          </div>
        ) : null}
      </div>
    </div>
  );
}
