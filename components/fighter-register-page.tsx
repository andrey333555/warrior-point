"use client";

import Link from "next/link";
import FighterOnboarding, {
  type FighterData,
} from "@/components/FighterOnboarding";
import { saveFighterOnboarding } from "@/lib/fighter-onboarding";
import { activateGuestMode } from "@/hooks/use-warrior-auth";

export default function FighterRegisterPage() {
  const handleComplete = (data: FighterData) => {
    saveFighterOnboarding(data);
    activateGuestMode();
    window.location.href = "/?guest=1&tab=passport";
  };

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto mb-6 flex w-full max-w-md items-center justify-between">
        <Link
          href="/?guest=1"
          className="text-sm text-gray-500 transition-colors hover:text-yellow-400"
        >
          ← На главную
        </Link>
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
          Warrior Point
        </p>
      </div>
      <FighterOnboarding onComplete={handleComplete} />
    </main>
  );
}
