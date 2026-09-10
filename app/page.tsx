"use client";

import { Suspense, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
  useWarriorAuth,
  deactivateGuestMode,
  isGuestModeActive,
} from "@/hooks/use-warrior-auth";
import { AuthGate } from "@/components/auth-gate";
import { TacticalOS } from "@/components/tactical-os";
import HomeHub from "@/components/home-hub";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

const GUEST_EVENTS = [
  "wp:guest-mode",
  "wp:guest-mode-off",
  "wp:dev-bypass",
  "wp:dev-bypass-off",
  "storage",
] as const;

function subscribeGuestMode(onChange: () => void): () => void {
  for (const name of GUEST_EVENTS) window.addEventListener(name, onChange);
  return () => {
    for (const name of GUEST_EVENTS) window.removeEventListener(name, onChange);
  };
}

/** Сервер localStorage не видит — на первом кадре обе стороны дают false. */
const guestModeOnServer = () => false;

function hasGuestQuery(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get("guest") === "1" ||
    searchParams.get("demo") === "1" ||
    searchParams.get("preview") === "1"
  );
}

function HomeShell() {
  const auth = useWarriorAuth();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  // Гостя из localStorage читаем через useSyncExternalStore: React берёт
  // серверный снимок на гидратацию и переключается на клиентский после неё.
  // Иначе первый кадр расходится, React выбрасывает разметку и перерисовывает
  // страницу целиком — на телефоне это выглядит как зависшая загрузка.
  const storedGuest = useSyncExternalStore(
    subscribeGuestMode,
    isGuestModeActive,
    guestModeOnServer,
  );

  const guestIntent = hasGuestQuery(searchParams) || storedGuest;

  // ?guest=1 / wp_guest_mode must never sit on «Загрузка…» or AuthGate.
  if (auth.status === "loading" && !guestIntent) {
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

  if (auth.status === "unauthenticated" && !guestIntent) {
    return <AuthGate />;
  }

  const inGuestMode =
    guestIntent ||
    (auth.status === "authenticated" &&
      Boolean(auth.guestMode ?? auth.devBypass));
  const fighterId =
    auth.status === "authenticated" ? auth.user.id : DEMO_FIGHTER_DB_ID;

  if (tab === "passport" || tab === "leaderboard") {
    return (
      <>
        {inGuestMode ? (
          <GuestBadge onClick={deactivateGuestMode} />
        ) : null}
        <TacticalOS fighterId={fighterId} />
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
