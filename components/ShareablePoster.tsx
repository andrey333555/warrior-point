"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { buildReferralLink } from "@/lib/referral";

export type ShareablePosterData = {
  name: string;
  nickname: string;
  photo: string;
  record: string;
  elo: number;
  round: number;
  roundLabel: string;
  city: string;
  weight: string;
  streak: number;
  winStreak: number;
  badges: string[];
  isNewcomer: boolean;
  monthSessions: number;
  referralCode: string;
};

type Props = {
  data: ShareablePosterData;
  onClose: () => void;
};

function PosterCanvas({ data }: { data: ShareablePosterData }) {
  const accent = data.isNewcomer ? "#3b82f6" : "#C9A84C";

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        width: 360,
        height: 640,
        background: "#0A0A0A",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full"
        style={{
          background: `${accent}22`,
          filter: "blur(60px)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative flex h-full flex-col px-6 pb-6 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <p
            className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: accent }}
          >
            Warrior Point
          </p>
          <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.2em] text-white/35">
            Round {data.round}
          </p>
        </div>

        <div className="relative mx-auto mb-4 h-36 w-36 overflow-hidden rounded-2xl border-2"
          style={{ borderColor: `${accent}66`, boxShadow: `0 0 32px ${accent}33` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.photo}
            alt={data.name}
            crossOrigin="anonymous"
            className="h-full w-full object-cover object-[center_15%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-black uppercase tracking-wide text-white">
            {data.name}
          </h2>
          <p className="mt-1 text-sm font-medium text-white/50">{data.nickname}</p>
        </div>

        {data.isNewcomer ? (
          <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-blue-200">Новый боец в реестре</p>
            <p className="mt-1 text-xs text-white/40">
              {data.monthSessions} тренировок в этом месяце
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-white/35">Рекорд</p>
              <p className="mt-1 text-lg font-bold text-white">{data.record}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-white/35">ELO</p>
              <p className="mt-1 text-lg font-bold" style={{ color: accent }}>
                {data.elo}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-white/35">Серия</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">{data.winStreak}W</p>
            </div>
          </div>
        )}

        <div
          className="mt-4 rounded-2xl border px-4 py-3"
          style={{
            borderColor: `${accent}33`,
            background: `linear-gradient(135deg, ${accent}14, transparent)`,
          }}
        >
          <p className="text-xs text-white/40">
            {data.city} · {data.weight}
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            Раунд {data.round} · {data.roundLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-red-400/25 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200">
              🔥 {data.streak} дн
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/60">
              {data.monthSessions} сессий / мес
            </span>
          </div>
        </div>

        {data.badges.length > 0 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {data.badges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-1 text-[10px] text-purple-200"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/30">
            Присоединяйся
          </p>
          <p
            className="mt-1 text-center font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-wider"
            style={{ color: accent }}
          >
            {data.referralCode}
          </p>
          <p className="mt-1 truncate text-center text-[9px] text-white/25">
            {buildReferralLink(data.referralCode)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ShareablePoster({ data, onClose }: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    const node = posterRef.current;
    if (!node) return null;

    const canvas = await html2canvas(node, {
      backgroundColor: "#0A0A0A",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    return canvas.toDataURL("image/png");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void capture().then((url) => {
        if (!cancelled) setPreviewUrl(url);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [capture, data]);

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = previewUrl ?? (await capture());
      if (!url) return;
      const link = document.createElement("a");
      link.href = url;
      link.download = `warrior-point-${data.name.toLowerCase()}.png`;
      link.click();
    } catch {
      setError("Не удалось сохранить постер");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = previewUrl ?? (await capture());
      if (!url) return;

      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `warrior-point-${data.name}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Warrior Point",
          text: `🥊 ${data.name} · Round ${data.round} · ${data.referralCode}`,
          files: [file],
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "Warrior Point",
          text: `🥊 ${data.name} · Round ${data.round} · ${buildReferralLink(data.referralCode)}`,
        });
        return;
      }

      await handleDownload();
    } catch {
      // user cancelled share
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/85 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Поделиться паспортом</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-white/40 hover:text-white"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex justify-center overflow-hidden rounded-2xl border border-white/[0.08]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Постер" className="h-auto w-full max-w-[240px]" />
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-sm text-white/40">
              Рендер постера…
            </div>
          )}
        </div>

        <div
          ref={posterRef}
          className="pointer-events-none fixed -left-[9999px] top-0"
          aria-hidden
        >
          <PosterCanvas data={data} />
        </div>

        {error ? <p className="mb-2 text-center text-xs text-red-400">{error}</p> : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDownload()}
            className="rounded-xl border border-white/10 bg-white/[0.05] py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            💾 Сохранить
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleShare()}
            className="rounded-xl py-3 text-sm font-medium disabled:opacity-50"
            style={{ background: "#C9A84C", color: "#0A0A0A" }}
          >
            📤 Поделиться
          </button>
        </div>
      </div>
    </div>
  );
}
