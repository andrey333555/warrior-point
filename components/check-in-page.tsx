"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  confirmViaBluetooth,
  confirmViaManualCode,
  confirmViaOfflineQr,
  formatSessionKey,
  getSessionByKey,
  SYSTEM_VALUE,
  type FixationSession,
} from "@/lib/session-fixation";
import { scanTrainerBeacon } from "@/lib/bluetooth-proximity";
import { verifyCheckInCode } from "@/lib/checkin-client";
import { resolveTrainerCheckInSite } from "@/lib/verify";
import TrainerOfflineQr from "@/components/TrainerOfflineQr";

type CheckInPageProps = {
  trainerId: string;
};

export default function CheckInPage({ trainerId }: CheckInPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionKey = searchParams.get("key") ?? "";

  const site = useMemo(() => resolveTrainerCheckInSite(trainerId), [trainerId]);
  const [session, setSession] = useState<FixationSession | null>(null);
  const [code, setCode] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showTrainerQr, setShowTrainerQr] = useState(false);

  useEffect(() => {
    if (sessionKey) {
      setSession(getSessionByKey(sessionKey));
    }
  }, [sessionKey]);

  const onConfirmed = useCallback((msg: string) => {
    setSuccess(msg);
    setError(null);
    window.setTimeout(() => router.push("/"), 2800);
  }, [router]);

  const handleCode = async () => {
    if (!session) {
      setError("Сначала нажми «Готов к тренировке» на экране записи.");
      return;
    }
    setBusy(true);
    const check = await verifyCheckInCode(session.trainerId, code);
    setBusy(false);
    if (!check.valid) {
      setError("Неверный код. Проверь экран тренера.");
      return;
    }
    const result = confirmViaManualCode(session.sessionKey, code, Date.now(), {
      serverVerified: check.source === "server",
    });
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setSession(result.session);
    onConfirmed("Тренировка зафиксирована. XP начислится после синхронизации.");
  };

  const handleQr = () => {
    if (!session) {
      setError("Сначала нажми «Готов к тренировке» на экране записи.");
      return;
    }
    const result = confirmViaOfflineQr(session.sessionKey, qrInput);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setSession(result.session);
    onConfirmed("QR подтверждён. Прогресс сохранится при появлении сети.");
  };

  const handleBluetooth = async () => {
    if (!session) {
      setError("Сначала нажми «Готов к тренировке» на экране записи.");
      return;
    }
    setBusy(true);
    setError(null);
    const scan = await scanTrainerBeacon(session.trainerId);
    if (!scan.available) {
      setError(scan.reason);
      setBusy(false);
      return;
    }
    const result = confirmViaBluetooth(
      session.sessionKey,
      scan.trainerId,
      scan.proof,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setSession(result.session);
    onConfirmed("Bluetooth подтверждён. Ожидает синхронизации.");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 pb-24 pt-6 text-white">
      <Link
        href="/"
        className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-cyan-300"
      >
        ← Паспорт
      </Link>

      <h1 className="mt-4 text-2xl font-bold">Подтверждение в зале</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {site.trainerName} · {site.gymName}
      </p>

      <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-3 py-2.5 text-xs text-amber-200/90">
        {SYSTEM_VALUE.warning}
      </div>

      {session ? (
        <div className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/[0.06] px-3 py-3">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.16em] text-cyan-300/70">
            Код тренировки
          </p>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-cyan-100">
            {formatSessionKey(session.sessionKey)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Статус: {session.status === "confirmed" ? "✓ подтверждено" : "ожидает подтверждения"}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-rose-300">
          Нет активного кода. Получи его на экране записи перед тренировкой.
        </p>
      )}

      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-rose-400">{error}</p>
      ) : null}

      <div className="mt-6 space-y-4">
        <section className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-4">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.2em] text-zinc-500">
            1 · QR offline
          </p>
          <button
            type="button"
            onClick={() => setShowTrainerQr((v) => !v)}
            className="mt-2 text-xs text-cyan-300 underline"
          >
            {showTrainerQr ? "Скрыть QR тренера" : "Показать QR тренера (демо)"}
          </button>
          {showTrainerQr ? (
            <div className="mt-3">
              <TrainerOfflineQr
                trainerId={site.trainerId}
                gymId={site.gymId}
                trainerName={site.trainerName}
              />
            </div>
          ) : null}
          <input
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Вставь payload QR или отсканируй"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-400/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleQr}
            className="mt-2 w-full rounded-xl border border-cyan-400/40 bg-cyan-500/15 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100"
          >
            Подтвердить QR
          </button>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-4">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.2em] text-zinc-500">
            2 · Bluetooth
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleBluetooth()}
            className="mt-3 w-full rounded-xl border border-violet-400/35 bg-violet-500/10 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-100 disabled:opacity-50"
          >
            {busy ? "Сканирование…" : "Найти маяк тренера"}
          </button>
          <p className="mt-2 text-[11px] text-zinc-500">
            Если Bluetooth недоступен — используй код ниже.
          </p>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-4">
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.2em] text-zinc-500">
            3 · Код тренера (fallback)
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="4 цифры"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-center font-[family-name:var(--font-jetbrains-mono)] text-2xl tracking-[0.3em] text-white placeholder:text-zinc-600 focus:border-[#C9A84C]/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCode}
            className="mt-2 w-full rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/10 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100"
          >
            Подтвердить кодом
          </button>
        </section>
      </div>
    </div>
  );
}
