"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  INVITE_WELCOME_BONUS_RUB,
  captureInviteFromSearch,
  clearPendingInvite,
  getPendingInvite,
  type PendingInvite,
} from "@/lib/invite-ref";
import { activateGuestMode } from "@/hooks/use-warrior-auth";

type Props = {
  /** Compact strip for hub; full modal for auth gate. */
  variant?: "modal" | "banner";
};

/**
 * Receiver euphoria: when someone opens a referral link (?ref=CODE),
 * show a high-energy welcome and keep the code for signup.
 */
export default function InviteWelcome({ variant = "modal" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invite, setInvite] = useState<PendingInvite | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fromUrl = captureInviteFromSearch(searchParams);
    setInvite(fromUrl ?? getPendingInvite());
  }, [searchParams]);

  if (dismissed || !invite) return null;

  const dismiss = () => {
    setDismissed(true);
  };

  const claim = () => {
    setDismissed(true);
    activateGuestMode();
    router.push("/booking");
  };

  const later = () => {
    dismiss();
  };

  if (variant === "banner") {
    return (
      <div
        className="mx-4 mb-3 overflow-hidden rounded-2xl border px-4 py-3"
        style={{
          borderColor: "rgba(201,168,76,0.4)",
          background:
            "linear-gradient(135deg, rgba(201,168,76,0.18), rgba(74,222,128,0.08))",
          boxShadow: "0 0 32px -12px rgba(201,168,76,0.5)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C]">
              Тебя пригласили
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              +{INVITE_WELCOME_BONUS_RUB} ₽ на первую тренировку
            </p>
            <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-white/45">
              Код {invite.code}
            </p>
          </div>
          <button
            type="button"
            onClick={claim}
            className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold"
            style={{ background: "#C9A84C", color: "#0A0A0A" }}
          >
            Забрать
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/80 p-4 backdrop-blur-md sm:items-center">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#C9A84C]/35 bg-[#0A0A0A] p-5 shadow-2xl"
        style={{
          boxShadow: "0 0 60px -16px rgba(201,168,76,0.55)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full"
          style={{
            background: "rgba(201,168,76,0.35)",
            filter: "blur(40px)",
          }}
        />

        <p className="relative text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-[#C9A84C]">
          Warrior Point
        </p>
        <h2 className="relative mt-3 text-center text-2xl font-black tracking-tight text-white">
          Тебя ждут на ковре
        </h2>
        <p className="relative mt-2 text-center text-sm text-white/55">
          Друг открыл тебе вход в Round 23. Забери бонус и начни первую
          тренировку — это твой момент.
        </p>

        <div
          className="relative mt-5 rounded-2xl border px-4 py-4 text-center"
          style={{
            borderColor: "rgba(74,222,128,0.35)",
            background:
              "linear-gradient(135deg, rgba(74,222,128,0.14), rgba(201,168,76,0.1))",
          }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/90">
            Подарок на старт
          </p>
          <p className="mt-1 text-3xl font-black text-white">
            +{INVITE_WELCOME_BONUS_RUB} ₽
          </p>
          <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#C9A84C]">
            {invite.code}
          </p>
        </div>

        <button
          type="button"
          onClick={claim}
          className="relative mt-5 w-full rounded-2xl py-3.5 text-sm font-bold"
          style={{ background: "#C9A84C", color: "#0A0A0A" }}
        >
          Забрать бонус и тренироваться
        </button>
        <button
          type="button"
          onClick={later}
          className="relative mt-2 w-full py-2 text-xs text-white/40"
        >
          Позже
        </button>
        <button
          type="button"
          onClick={() => {
            clearPendingInvite();
            dismiss();
          }}
          className="relative mt-1 w-full py-1 text-[10px] text-white/25"
        >
          Это не мой инвайт
        </button>
      </div>
    </div>
  );
}
