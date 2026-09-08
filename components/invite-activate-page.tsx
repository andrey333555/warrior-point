"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { saveFighterOnboarding, STYLE_LABELS } from "@/lib/fighter-onboarding";
import { activateGuestMode } from "@/hooks/use-warrior-auth";

type InvitePublic = {
  name: string;
  city: string;
  club: string;
  style: string;
  weight?: number;
  height?: number;
  record?: string;
  status: string;
};

export default function InviteActivatePage({ code }: { code: string }) {
  const [data, setData] = useState<InvitePublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(code)}`);
        const json = (await res.json()) as InvitePublic & {
          ok?: boolean;
          message?: string;
        };
        if (cancelled) return;
        if (!json.ok) {
          setError(json.message ?? "Код не найден");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setError("Не удалось открыть приглашение");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const activate = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await fetch(`/api/invite/${encodeURIComponent(code)}`, { method: "POST" });
      saveFighterOnboarding({
        name: data.name,
        nickname: data.name,
        city: data.city,
        club: data.club,
        style: data.style || "mma",
        weight: data.weight,
        height: data.height,
        record: data.record,
      });
      activateGuestMode();
      window.location.href = "/?guest=1&tab=passport";
    } catch {
      setBusy(false);
      setError("Не удалось активировать");
    }
  };

  if (error && !data) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0A0A0A] px-6 text-center text-white">
        <p className="text-lg font-semibold">Ссылка недействительна</p>
        <p className="mt-2 text-sm text-white/45">{error}</p>
        <Link href="/" className="mt-6 text-sm text-[#C9A84C]">
          На главную
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#0A0A0A] text-sm text-white/40">
        Проверяем код…
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#0A0A0A] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[#C9A84C]/25 bg-gradient-to-br from-gray-900 to-black p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
          Warrior Point
        </p>
        <h1 className="mt-2 text-2xl font-bold">Активируй свой паспорт</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          {data.name}, черновик уже создан. Открой паспорт — займёт меньше минуты.
        </p>
        <dl className="mt-5 space-y-2 text-sm">
          {data.club ? (
            <div className="flex justify-between gap-3">
              <dt className="text-white/40">Клуб</dt>
              <dd>{data.club}</dd>
            </div>
          ) : null}
          {data.city ? (
            <div className="flex justify-between gap-3">
              <dt className="text-white/40">Город</dt>
              <dd>{data.city}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-white/40">Стиль</dt>
            <dd>{STYLE_LABELS[data.style] ?? data.style}</dd>
          </div>
          {data.record ? (
            <div className="flex justify-between gap-3">
              <dt className="text-white/40">Рекорд</dt>
              <dd>{data.record}</dd>
            </div>
          ) : null}
        </dl>
        <button
          type="button"
          disabled={busy}
          onClick={() => void activate()}
          className="mt-6 w-full rounded-2xl bg-[#C9A84C] py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {busy ? "Открываем…" : "Активировать паспорт"}
        </button>
        {data.status === "activated" ? (
          <p className="mt-3 text-center text-[11px] text-white/35">
            Этот код уже активировали — можно открыть паспорт снова.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-center text-xs text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
