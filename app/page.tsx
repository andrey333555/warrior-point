"use client";

import { useWarriorAuth, deactivateGuestMode } from "@/hooks/use-warrior-auth";
import { AuthGate } from "@/components/auth-gate";
import { TacticalOS } from "@/components/tactical-os";

export default function Home() {
  const auth = useWarriorAuth();

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080810]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-400" />
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-600">
            Загрузка паспорта…
          </p>
        </div>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return <AuthGate />;
  }

  const inGuestMode = auth.guestMode ?? auth.devBypass;

  return (
    <>
      {inGuestMode ? (
        <button
          type="button"
          onClick={deactivateGuestMode}
          title="Гостевой режим · нажми чтобы выйти"
          className="fixed right-3 top-3 z-[300] flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-black/80 px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-300 opacity-70 backdrop-blur-md transition-opacity hover:opacity-100"
          style={{ boxShadow: "0 0 12px -3px rgba(251,191,36,0.45)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Гость
        </button>
      ) : null}

      <TacticalOS fighterId={auth.user.id} />
    </>
  );
}
