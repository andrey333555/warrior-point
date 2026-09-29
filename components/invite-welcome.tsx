"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  INVITE_WELCOME_BONUS_RUB,
  captureInviteFromSearch,
  clearPendingInvite,
  getPendingInvite,
  type PendingInvite,
} from "@/lib/invite-ref";
import {
  buildRegisterUrl,
  clearPendingBonus,
  savePendingBonus,
} from "@/lib/invite-bonus";
import InviteBonusPopup from "@/components/InviteBonusPopup";
import { DEMO_FIGHTER_PORTRAIT } from "@/lib/warrior-constants";

type Props = {
  /** Compact strip for hub; full modal for auth gate. */
  variant?: "modal" | "banner";
};

const INVITE_TTL_HOURS = 24;

function inviterFromCode(code: string): { name: string; avatar?: string } {
  const prefix = (code.split("-")[0] ?? "").trim();
  if (/roman|king|cobra/i.test(code)) {
    return { name: "Сергей Р.", avatar: DEMO_FIGHTER_PORTRAIT };
  }
  if (!prefix) return { name: "Сергей Р." };
  const name =
    prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
  return { name };
}

function remainingHours(capturedAt: string): number {
  const end = new Date(capturedAt).getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000;
  return Math.max(0, (end - Date.now()) / (60 * 60 * 1000));
}

/**
 * Receiver euphoria: when someone opens a referral link (?ref=CODE),
 * show a high-energy welcome and keep the code for signup.
 */
export default function InviteWelcome({ variant = "modal" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invite, setInvite] = useState<PendingInvite | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    // Код переживает редирект — бонус зачисляем после регистрации.
    savePendingBonus(invite.code, INVITE_WELCOME_BONUS_RUB);
    router.push(buildRegisterUrl(invite.code, INVITE_WELCOME_BONUS_RUB));
  };

  const later = () => {
    dismiss();
  };

  const inviter = inviterFromCode(invite.code);

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

  return mounted
    ? createPortal(
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/80 p-4 backdrop-blur-md sm:items-center">
          <InviteBonusPopup
            inviterName={inviter.name}
            inviterAvatar={inviter.avatar}
            inviteCode={invite.code}
            bonusAmount={INVITE_WELCOME_BONUS_RUB}
            expiresInHours={remainingHours(invite.capturedAt)}
            totalRedeemed={4231}
            onClaim={claim}
            onDismiss={later}
            onWrongInvite={() => {
              clearPendingInvite();
              clearPendingBonus();
              dismiss();
            }}
          />
        </div>,
        document.body,
      )
    : null;
}
