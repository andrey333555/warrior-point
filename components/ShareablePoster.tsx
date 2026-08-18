"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  buildReferralLink,
  getShareLinks,
  getShareText,
} from "@/lib/referral";

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

const GOLD = "#C9A84C";

function PosterCanvas({ data }: { data: ShareablePosterData }) {
  const accent = data.isNewcomer ? "#3b82f6" : GOLD;

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        width: 360,
        height: 640,
        background: "#0A0A0A",
        fontFamily: "system-ui, sans-serif",
        color: "#FFFFFF",
      }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full"
        style={{
          background: `${accent}28`,
          filter: "blur(70px)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full"
        style={{
          background: "rgba(239,68,68,0.12)",
          filter: "blur(50px)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          opacity: 0.06,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative flex h-full flex-col px-6 pb-5 pt-5">
        <div className="mb-3 flex items-center justify-between">
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

        <div
          className="relative mx-auto mb-3 h-32 w-32 overflow-hidden rounded-2xl border-2"
          style={{
            borderColor: `${accent}66`,
            boxShadow: `0 0 36px ${accent}40`,
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
          <h2 className="text-3xl font-black uppercase tracking-wide text-white">
            {data.name}
          </h2>
          <p className="mt-1 text-sm font-medium text-white/50">{data.nickname}</p>
        </div>

        {data.isNewcomer ? (
          <div
            className="mt-4 rounded-2xl border px-4 py-3 text-center"
            style={{
              borderColor: "rgba(59,130,246,0.3)",
              background: "rgba(59,130,246,0.12)",
            }}
          >
            <p className="text-sm font-semibold text-blue-300">
              Новый боец в реестре
            </p>
            <p className="mt-1 text-xs text-white/45">
              {data.monthSessions} тренировок в этом месяце
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(
              [
                ["Рекорд", data.record, "#FFFFFF"],
                ["ELO", String(data.elo), accent],
                ["Серия", `${data.winStreak}W`, "#4ade80"],
              ] as const
            ).map(([label, value, color]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-center"
              >
                <p className="text-[9px] uppercase tracking-wider text-white/35">
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
          className="mt-3 rounded-2xl border px-4 py-3"
          style={{
            borderColor: `${accent}40`,
            background: `linear-gradient(135deg, ${accent}22, transparent)`,
          }}
        >
          <p className="text-xs text-white/45">
            {data.city} · {data.weight}
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            Раунд {data.round} · {data.roundLabel}
          </p>
        </div>

        {/* Receiver hook — gift + challenge */}
        <div
          className="mt-3 rounded-2xl border px-4 py-3.5 text-center"
          style={{
            borderColor: "rgba(74,222,128,0.35)",
            background:
              "linear-gradient(135deg, rgba(74,222,128,0.14), rgba(201,168,76,0.08))",
            boxShadow: "0 0 28px -10px rgba(74,222,128,0.45)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/90">
            Тебя зовут в Round 23
          </p>
          <p className="mt-1.5 text-lg font-black text-white">
            +300 ₽ на первую тренировку
          </p>
          <p className="mt-1 text-[11px] text-white/50">
            Открой ссылку · забери бонус · выйди на ковёр
          </p>
        </div>

        <div
          className="mt-auto rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3"
        >
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/35">
            Код друга
          </p>
          <p
            className="mt-1 text-center font-[family-name:var(--font-jetbrains-mono)] text-sm font-bold tracking-wider"
            style={{ color: accent }}
          >
            {data.referralCode}
          </p>
          <p className="mt-1 truncate text-center text-[9px] text-white/28">
            {buildReferralLink(data.referralCode)}
          </p>
        </div>
      </div>
    </div>
  );
}

function SenderEuphoria({
  name,
  onDone,
}: {
  name: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#C9A84C]/35 bg-gradient-to-b from-[#C9A84C]/20 to-transparent px-4 py-8 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(201,168,76,0.45), transparent 55%)",
        }}
      />
      <p className="relative text-3xl font-black tracking-tight text-white">
        Ты в игре
      </p>
      <p className="relative mt-2 text-sm text-[#C9A84C]">
        Паспорт {name} уходит к новому бойцу
      </p>
      <p className="relative mt-3 text-xs text-white/45">
        Когда друг займёт тренировку — тебе бонус. Ему — эйфория первого раунда.
      </p>
      <div className="relative mt-5 flex justify-center gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C9A84C]"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"compose" | "euphoria">("compose");
  const [copied, setCopied] = useState(false);

  const shareLinks = getShareLinks(data.referralCode, data.name, undefined, {
    fighterName: data.name,
    round: data.round,
  });
  const shareBody = getShareText(data.referralCode, data.name, {
    fighterName: data.name,
    round: data.round,
  });

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
  }, [capture, data]);

  const triggerHaptic = () => {
    try {
      (
        window as Window & {
          Telegram?: { WebApp?: { HapticFeedback?: { notificationOccurred: (t: string) => void } } };
        }
      ).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    } catch {
      /* ignore */
    }
  };

  const enterEuphoria = useCallback(() => {
    triggerHaptic();
    setPhase("euphoria");
  }, []);

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
      enterEuphoria();
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
          title: "Warrior Point · Round 23",
          text: shareBody,
          files: [file],
        });
        enterEuphoria();
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "Warrior Point · Round 23",
          text: shareBody,
          url: shareLinks.copy,
        });
        enterEuphoria();
        return;
      }

      await handleDownload();
    } catch {
      // user cancelled share — no euphoria
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLinks.copy);
      setCopied(true);
      triggerHaptic();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Не удалось скопировать ссылку");
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
        {phase === "euphoria" ? (
          <SenderEuphoria name={data.name} onDone={onClose} />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  Другу — азарт. Тебе — статус рекрутера.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-white/40 hover:text-white"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex justify-center overflow-hidden rounded-2xl border border-white/[0.08]">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Постер"
                  className="h-auto w-full max-w-[220px]"
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center text-sm text-white/40">
                  Собираем постер…
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

            {error ? (
              <p className="mb-2 text-center text-xs text-red-400">{error}</p>
            ) : null}

            <div className="mb-2 grid grid-cols-3 gap-1.5">
              <a
                href={shareLinks.telegram}
                target="_blank"
                rel="noreferrer"
                onClick={() => window.setTimeout(enterEuphoria, 600)}
                className="rounded-xl border border-sky-400/25 bg-sky-400/10 py-2.5 text-center text-[11px] font-semibold text-sky-300"
              >
                Telegram
              </a>
              <a
                href={shareLinks.whatsapp}
                target="_blank"
                rel="noreferrer"
                onClick={() => window.setTimeout(enterEuphoria, 600)}
                className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 py-2.5 text-center text-[11px] font-semibold text-emerald-300"
              >
                WhatsApp
              </a>
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-[11px] font-semibold text-white/70"
              >
                {copied ? "Скопировано" : "Ссылка"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDownload()}
                className="rounded-xl border border-white/10 bg-white/[0.05] py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                Сохранить
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleShare()}
                className="rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
                style={{ background: GOLD, color: "#0A0A0A" }}
              >
                Отправить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
