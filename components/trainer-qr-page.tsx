"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { buildSessionCompleteUrl } from "@/lib/session-complete";
import TrainerOfflineQr from "@/components/TrainerOfflineQr";
import { resolveTrainerCheckInSite } from "@/lib/verify";

type TrainerQrPageProps = {
  trainerId: number;
  trainerName: string;
};

export default function TrainerQrPage({
  trainerId,
  trainerName,
}: TrainerQrPageProps) {
  const router = useRouter();
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const site = resolveTrainerCheckInSite(trainerId);

  useEffect(() => {
    setSessionUrl(buildSessionCompleteUrl(trainerId, window.location.origin));
  }, [trainerId]);

  return (
    <div className="flex min-h-screen flex-col bg-black p-4 pb-10 text-white">
      <p className="mb-4 text-sm text-gray-400">trainerId: {trainerId}</p>
      <button
        type="button"
        onClick={() => router.push("/")}
        className="mb-6 w-fit text-sm text-gray-500 transition-colors hover:text-gray-300"
      >
        ← Назад
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div>
          <p className="text-sm uppercase tracking-widest text-gray-500">
            Warrior Point · QR
          </p>
          <h1 className="mt-2 text-2xl font-bold">🥊 {trainerName}</h1>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0_0_24px_rgba(34,197,94,0.15)]">
          {sessionUrl ? (
            <QRCodeSVG
              value={sessionUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin
            />
          ) : (
            <div className="flex h-[220px] w-[220px] items-center justify-center text-sm text-gray-400">
              Загрузка…
            </div>
          )}
        </div>

        {sessionUrl ? (
          <p className="max-w-xs break-all text-xs text-gray-500">{sessionUrl}</p>
        ) : null}
        <p className="text-sm text-gray-400">
          Отсканируй после тренировки — откроется экран завершения сессии
        </p>

        <div className="mt-8 w-full max-w-sm border-t border-white/10 pt-8">
          <TrainerOfflineQr
            trainerId={site.trainerId}
            gymId={site.gymId}
            trainerName={trainerName}
          />
        </div>
      </div>
    </div>
  );
}
