"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { buildReferralLink } from "@/lib/referral";
import {
  THEME_OPTIONS,
  getPosterPalette,
  resolveThemeMode,
  useThemePreference,
  type ThemeMode,
  type ThemePreference,
} from "@/lib/theme";

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
  title?: string;
};

const POSTER_THEME_CHIPS: ThemePreference[] = ["dark", "light", "hybrid", "auto"];

function PosterCanvas({
  data,
  mode,
}: {
  data: ShareablePosterData;
  mode: ThemeMode;
}) {
  const accent = data.isNewcomer ? "#3b82f6" : "#C9A84C";
  const p = getPosterPalette(mode, accent);
  const isHybrid = mode === "hybrid";
  const footerOnDark = isHybrid || mode === "dark";

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        width: 360,
        height: 640,
        background: isHybrid
          ? `linear-gradient(180deg, ${p.bg} 0%, ${p.bg} 72%, ${p.bgBottom} 72%, ${p.bgBottom} 100%)`
          : p.bg,
        fontFamily: "system-ui, sans-serif",
        color: p.text,
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
        className="absolute inset-0"
        style={{
          opacity: p.gridOpacity,
          backgroundImage:
            mode === "dark"
              ? "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)"
              : "linear-gradient(rgba(10,10,10,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,10,0.2) 1px, transparent 1px)",
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
          <p
            className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.2em]"
            style={{ color: p.faint }}
          >
            Round {data.round}
          </p>
        </div>

        <div
          className="relative mx-auto mb-4 h-36 w-36 overflow-hidden rounded-2xl border-2"
          style={{
            borderColor: `${accent}66`,
            boxShadow: `0 0 32px ${accent}33`,
          }}
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
          <h2
            className="text-3xl font-black uppercase tracking-wide"
            style={{ color: p.text }}
          >
            {data.name}
          </h2>
          <p className="mt-1 text-sm font-medium" style={{ color: p.muted }}>
            {data.nickname}
          </p>
        </div>

        {data.isNewcomer ? (
          <div
            className="mt-5 rounded-2xl border px-4 py-3 text-center"
            style={{
              borderColor: "rgba(59,130,246,0.25)",
              background: "rgba(59,130,246,0.1)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "#1d4ed8" }}>
              Новый боец в реестре
            </p>
            <p className="mt-1 text-xs" style={{ color: p.muted }}>
              {data.monthSessions} тренировок в этом месяце
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(
              [
                ["Рекорд", data.record, p.text],
                ["ELO", String(data.elo), accent],
                ["Серия", `${data.winStreak}W`, "#16a34a"],
              ] as const
            ).map(([label, value, color]) => (
              <div
                key={label}
                className="rounded-xl border p-2.5 text-center"
                style={{ background: p.cardBg, borderColor: p.cardBorder }}
              >
                <p
                  className="text-[9px] uppercase tracking-wider"
                  style={{ color: p.faint }}
                >
                  {label}
                </p>
                <p className="mt-1 text-lg font-bold" style={{ color }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div
          className="mt-4 rounded-2xl border px-4 py-3"
          style={{
            borderColor: `${accent}33`,
            background: `linear-gradient(135deg, ${accent}18, transparent)`,
          }}
        >
          <p className="text-xs" style={{ color: p.muted }}>
            {data.city} · {data.weight}
          </p>
          <p className="mt-1 text-base font-semibold" style={{ color: p.text }}>
            Раунд {data.round} · {data.roundLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className="rounded-full border px-2 py-0.5 text-[10px]"
              style={{
                borderColor: "rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.1)",
                color: mode === "dark" ? "#fecaca" : "#b91c1c",
              }}
            >
              🔥 {data.streak} дн
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-[10px]"
              style={{
                borderColor: p.cardBorder,
                background: p.cardBg,
                color: p.muted,
              }}
            >
              {data.monthSessions} сессий / мес
            </span>
          </div>
        </div>

        {data.badges.length > 0 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {data.badges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="rounded-full border px-2.5 py-1 text-[10px]"
                style={{
                  borderColor: "rgba(168,85,247,0.25)",
                  background: "rgba(168,85,247,0.1)",
                  color: mode === "dark" ? "#e9d5ff" : "#6b21a8",
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        <div
          className="mt-auto rounded-2xl border px-4 py-3"
          style={{
            borderColor: footerOnDark
              ? "rgba(255,255,255,0.12)"
              : p.cardBorder,
            background: footerOnDark
              ? "rgba(255,255,255,0.06)"
              : p.cardBg,
          }}
        >
          <p
            className="text-center text-[10px] uppercase tracking-[0.2em]"
            style={{
              color: footerOnDark ? "rgba(255,255,255,0.35)" : p.faint,
            }}
          >
            Присоединяйся
          </p>
          <p
            className="mt-1 text-center font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-wider"
            style={{ color: accent }}
          >
            {data.referralCode}
          </p>
          <p
            className="mt-1 truncate text-center text-[9px]"
            style={{
              color: footerOnDark ? "rgba(255,255,255,0.28)" : p.faint,
            }}
          >
            {buildReferralLink(data.referralCode)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ShareablePoster({
  data,
  onClose,
  title = "Поделиться паспортом",
}: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const { preference, mode, setPreference } = useThemePreference();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palette = getPosterPalette(mode);

  const capture = useCallback(async () => {
    const node = posterRef.current;
    if (!node) return null;

    const canvas = await html2canvas(node, {
      backgroundColor: palette.captureBg,
      scale: 2,
      useCORS: true,
      logging: false,
    });

    return canvas.toDataURL("image/png");
  }, [palette.captureBg]);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    const timer = window.setTimeout(() => {
      void capture().then((url) => {
        if (!cancelled) setPreviewUrl(url);
      });
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [capture, data, mode]);

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
          <p className="text-sm font-semibold text-white">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-white/40 hover:text-white"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {POSTER_THEME_CHIPS.map((id) => {
            const opt = THEME_OPTIONS.find((o) => o.id === id)!;
            const active = preference === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPreference(id)}
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition"
                style={{
                  background: active
                    ? "rgba(201,168,76,0.2)"
                    : "rgba(255,255,255,0.06)",
                  color: active ? "#C9A84C" : "rgba(255,255,255,0.55)",
                  border: active
                    ? "0.5px solid rgba(201,168,76,0.45)"
                    : "0.5px solid rgba(255,255,255,0.08)",
                }}
              >
                {opt.emoji} {opt.label}
              </button>
            );
          })}
        </div>
        {preference === "auto" ? (
          <p className="mb-2 text-[10px] text-white/35">
            Авто → сейчас {resolveThemeMode("auto") === "light" ? "светлая" : "тёмная"}
          </p>
        ) : null}

        <div className="mb-4 flex justify-center overflow-hidden rounded-2xl border border-white/[0.08]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Постер"
              className="h-auto w-full max-w-[240px]"
            />
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
          <PosterCanvas data={data} mode={mode} />
        </div>

        {error ? (
          <p className="mb-2 text-center text-xs text-red-400">{error}</p>
        ) : null}

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
