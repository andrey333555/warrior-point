"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWarriorAuth, deactivateGuestMode } from "@/hooks/use-warrior-auth";
import { AuthGate } from "@/components/auth-gate";
import { TacticalOS } from "@/components/tactical-os";
import HomeHub from "@/components/home-hub";

function HomeShell() {
  const auth = useWarriorAuth();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  if (auth.status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-400" />
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-600">
            Загрузка…
          </p>
        </div>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return <AuthGate />;
  }

  const inGuestMode = auth.guestMode ?? auth.devBypass;

  // Passport / leaderboard keep the previous TacticalOS shell
  if (tab === "passport" || tab === "leaderboard") {
    return (
      <>
        {inGuestMode ? (
          <GuestBadge onClick={deactivateGuestMode} />
        ) : null}
        <TacticalOS fighterId={auth.user.id} />
      </>
    );
  }

  return (
    <>
      {inGuestMode ? <GuestBadge onClick={deactivateGuestMode} /> : null}
      <HomeHub />
    </>
  );
}

function GuestBadge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Гостевой режим · нажми чтобы выйти"
      className="fixed right-3 top-3 z-[300] flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/80 px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-300 opacity-70 backdrop-blur-md transition-opacity hover:opacity-100"
      style={{ boxShadow: "0 0 12px -3px rgba(251,191,36,0.45)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Гость
    </button>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeShell />
    </Suspense>
  );
}
