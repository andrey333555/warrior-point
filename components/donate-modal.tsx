"use client";

/**
 * DonateModal — Yandex Music–style bottom sheet for direct fighter tips via SBP.
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HexAvatar } from "@/components/hex-avatar";
import type { FundraiserProgress } from "@/lib/supabase/donations";
import { DONATION_PLATFORM_FEE_PCT } from "@/lib/economy";

const QUICK_AMOUNTS = [300, 700, 1000, 5000] as const;

const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function SbpGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#1a1a2e" stroke="#5eead4" strokeWidth="1.2" />
      <path d="M6 10 H18 M6 14 H13" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="17" cy="14" r="2" fill="#a855f7" />
    </svg>
  );
}

/** Payload passed to `onSuccess` after a confirmed SBP transfer. */
export type DonationSuccessPayload = {
  grossRub: number;
  netRub: number;
  newDonorBalance: number;
  donationId?: string;
};

export type DonatePaymentHandler = (
  amount: number,
  comment: string,
) =>
  | DonationSuccessPayload
  | null
  | void
  | Promise<DonationSuccessPayload | null | void>;

export type DonateSuccessHandler = (data?: DonationSuccessPayload) => void;

export interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  fighterName: string;
  fighterInitials: string;
  fundraiser: FundraiserProgress;
  donorBalance: number;
  busy?: boolean;
  error?: string | null;
  /** Runs the payment transfer; may return success payload for `onSuccess`. */
  onDonate: DonatePaymentHandler;
  /** Optional post-payment hook (Yandex Music–style success toast / refresh). */
  onSuccess?: DonateSuccessHandler;
}

export function DonateModal({
  open,
  onClose,
  fighterName,
  fighterInitials,
  fundraiser,
  donorBalance,
  busy = false,
  error,
  onDonate,
  onSuccess,
}: DonateModalProps) {
  const [amount, setAmount] = useState(300);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setAmount(300);
      setComment("");
    }
  }, [open]);

  const handleAmountInput = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setAmount(digits ? Number.parseInt(digits, 10) : 0);
  }, []);

  const submitPayment = useCallback(async () => {
    if (amount < 50 || busy) return;

    const result = await onDonate(amount, comment);
    if (result) {
      onSuccess?.(result);
    }
  }, [amount, busy, comment, onDonate, onSuccess]);

  const submit = useCallback(() => {
    void submitPayment();
  }, [submitPayment]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[260] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-t-[1.75rem] border border-white/[0.1] bg-[#0c0c14]"
            style={{
              boxShadow: "0 -12px 80px -16px rgba(168,85,247,0.45)",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="flex justify-center pt-2.5">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            <div className="px-5 pt-4">
              {/* Fighter mini-card + fundraiser progress */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
                <HexAvatar initials={fighterInitials} level={1} size={44} showTierBadge={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-[family-name:var(--font-geist-sans)] text-[14px] font-semibold text-white">
                    {fighterName}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                    {fundraiser.title}: {fmtRub.format(fundraiser.raisedRub)} из{" "}
                    {fmtRub.format(fundraiser.goalRub)}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(fundraiser.pct, 1)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Amount */}
              <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
                Введите сумму доната
              </p>

              <div className="mt-3 flex items-baseline gap-1 border-b border-white/[0.12] pb-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount > 0 ? amount.toLocaleString("ru-RU") : ""}
                  onChange={(e) => handleAmountInput(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-jetbrains-mono)] text-[2.4rem] font-extrabold leading-none tracking-tight text-white focus:outline-none"
                  aria-label="Сумма доната в рублях"
                />
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xl font-bold text-zinc-500">
                  ₽
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={
                      amount === preset
                        ? "rounded-full border border-fuchsia-400/70 bg-fuchsia-500/15 px-3.5 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold text-fuchsia-200 shadow-[0_0_16px_-6px_rgba(232,121,249,0.8)]"
                        : "rounded-full border border-white/[0.1] bg-black/40 px-3.5 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                    }
                  >
                    {fmtRub.format(preset)}
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Оставьте комментарий бойцу"
                rows={2}
                maxLength={280}
                className="mt-5 w-full resize-none rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 font-[family-name:var(--font-geist-sans)] text-[13px] text-white placeholder:text-zinc-600 focus:border-fuchsia-400/40 focus:outline-none"
              />

              <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                Баланс · {fmtRub.format(donorBalance)} · комиссия платформы {DONATION_PLATFORM_FEE_PCT}%
              </p>

              {error ? (
                <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] text-rose-400">
                  {error}
                </p>
              ) : null}

              <motion.button
                type="button"
                disabled={busy || amount < 50}
                whileTap={{ scale: 0.98 }}
                onClick={submit}
                className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 py-4 font-[family-name:var(--font-geist-mono)] text-[11px] font-extrabold uppercase tracking-[0.22em] text-white transition-opacity disabled:opacity-45"
                style={{ boxShadow: "0 0 28px -8px rgba(52,211,153,0.55)" }}
              >
                <SbpGlyph className="h-5 w-5" />
                {busy ? "Обработка…" : "Перевести донат через СБП"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function SupportFighterButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      className="flex w-full max-w-[320px] items-center justify-center gap-2.5 rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/15 via-black/60 to-cyan-500/12 px-5 py-4 font-[family-name:var(--font-geist-mono)] text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-100"
      style={{ boxShadow: "0 0 36px -10px rgba(52,211,153,0.5)" }}
    >
      <SbpGlyph className="h-5 w-5" />
      Поддержать бойца (СБП)
    </motion.button>
  );
}
