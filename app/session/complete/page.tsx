import type { Metadata } from "next";
import { Suspense } from "react";
import CompleteSession from "@/components/session-complete-page";

export const metadata: Metadata = {
  title: "Тренировка завершена · Warrior Point",
  description: "Session complete · XP, settlement и обновление паспорта",
};

function SessionCompleteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]/70">
        Загрузка сессии…
      </p>
    </div>
  );
}

export default function SessionCompleteRoute() {
  return (
    <Suspense fallback={<SessionCompleteFallback />}>
      <CompleteSession />
    </Suspense>
  );
}
