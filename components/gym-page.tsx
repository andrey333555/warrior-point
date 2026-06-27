"use client";

import Link from "next/link";
import type { GymEntry } from "@/lib/gyms";
import { GYM_ACCENT_HEX } from "@/lib/gyms";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import { AuthGate } from "@/components/auth-gate";
import { GymDetailBody } from "@/components/gym-detail-body";

type GymPageProps = {
  gym: GymEntry;
};

export default function GymPage({ gym }: GymPageProps) {
  const auth = useWarriorAuth();
  const hexColor = GYM_ACCENT_HEX[gym.accent];

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.3em] text-cyan-400/70">
          Загрузка зала…
        </p>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return <AuthGate />;
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        <div
          className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full blur-[100px]"
          style={{ background: `${hexColor}18` }}
        />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[100px]" />
      </div>

      <div className="relative flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden border-x border-white/[0.06] bg-zinc-950 shadow-[0_0_80px_-20px_rgba(0,240,255,0.15)]">
        <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3">
          <Link
            href="/map"
            className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-neutral-400 backdrop-blur-md transition-colors hover:text-white"
          >
            ← Map
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-neutral-400 backdrop-blur-md transition-colors hover:text-white"
          >
            OS
          </Link>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-12 scrollbar-hide">
          <GymDetailBody gym={gym} clientId={auth.user.id} />
        </main>
      </div>
    </div>
  );
}
