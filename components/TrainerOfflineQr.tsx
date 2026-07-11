"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  buildTrainerOfflineQr,
  encodeTrainerQr,
  type TrainerQrPayload,
} from "@/lib/session-fixation";
import { formatCountdown } from "@/lib/verify";
import { fetchTrainerCodeSession } from "@/lib/checkin-client";

type TrainerOfflineQrProps = {
  trainerId: string;
  gymId: string;
  trainerName?: string;
};

type QrView = {
  payload: string;
  displayCode: string;
  expiresInMs: number;
  source: "server" | "local";
};

export default function TrainerOfflineQr({
  trainerId,
  gymId,
  trainerName = "Тренер",
}: TrainerOfflineQrProps) {
  const [now, setNow] = useState(Date.now());
  const [qrView, setQrView] = useState<QrView | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/checkin/qr?trainerId=${encodeURIComponent(trainerId)}&gymId=${encodeURIComponent(gymId)}`,
        );
        const data = (await res.json()) as {
          ok?: boolean;
          configured?: boolean;
          payload?: TrainerQrPayload;
          displayCode?: string;
          expiresInMs?: number;
        };

        if (!cancelled && res.ok && data.ok && data.configured && data.payload) {
          setQrView({
            payload: encodeTrainerQr(data.payload),
            displayCode: data.displayCode ?? data.payload.code,
            expiresInMs: data.expiresInMs ?? 0,
            source: "server",
          });
          return;
        }
      } catch {
        // fall through to local demo QR
      }

      if (cancelled) return;

      const payload = buildTrainerOfflineQr(trainerId, gymId, now);
      const codeSession = await fetchTrainerCodeSession(trainerId);
      setQrView({
        payload: encodeTrainerQr(payload),
        displayCode: codeSession.displayCode,
        expiresInMs: codeSession.expiresInMs,
        source: codeSession.source,
      });
    };

    void load();
    const refresh = window.setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [trainerId, gymId, now]);

  const expiresLabel = useMemo(
    () => (qrView ? formatCountdown(qrView.expiresInMs) : "—"),
    [qrView],
  );

  return (
    <div
      className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 p-5"
      style={{ boxShadow: "0 0 32px -12px rgba(201,168,76,0.3)" }}
    >
      <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-[#C9A84C]/80">
        Offline QR · {trainerName}
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        {qrView?.source === "server"
          ? "Серверная подпись · нельзя подделать из DevTools"
          : "Демо QR · работает без секрета"}
      </p>

      <div className="mx-auto mt-4 flex w-fit items-center justify-center rounded-2xl bg-white p-3">
        {qrView ? (
          <QRCodeSVG value={qrView.payload} size={168} level="M" />
        ) : (
          <div className="flex h-[168px] w-[168px] items-center justify-center text-xs text-zinc-500">
            Загрузка…
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/50 px-4 py-3 text-center">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.18em] text-zinc-500">
          Код (fallback)
        </p>
        <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-3xl font-bold tracking-[0.2em] text-white">
          {qrView?.displayCode ?? "····"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Обновится через {expiresLabel}
        </p>
      </div>
    </div>
  );
}
