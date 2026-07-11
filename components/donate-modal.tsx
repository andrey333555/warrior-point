"use client";

/**
 * DonateModal — Yandex Music–style bottom sheet.
 * Presets + «Другая» · СБП для любого пользователя (без входа).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HexAvatar } from "@/components/hex-avatar";
import type { FundraiserProgress } from "@/lib/supabase/donations";
import { DONATION_PLATFORM_FEE_PCT, donateSettlement } from "@/lib/economy";

const QUICK_AMOUNTS = [300, 700, 1000, 5000] as const;

const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

type Screen = "pick" | "sbp" | "done";
type AmountMode = "preset" | "custom";

function SbpGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#1a1a2e" stroke="#5eead4" strokeWidth="1.2" />
      <path d="M6 10 H18 M6 14 H13" stroke="#5eead4" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="17" cy="14" r="2" fill="#a855f7" />
    </svg>
  );
}

export type DonationSuccessPayload = {
  grossRub: number;
  netRub: number;
  newDonorBalance: number;
  donationId?: string;
  source?: "wallet" | "sbp_guest";
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
  /** Platform wallet — shown only as hint; SBP works without balance. */
  donorBalance?: number;
  busy?: boolean;
  error?: string | null;
  onDonate: DonatePaymentHandler;
  onSuccess?: DonateSuccessHandler;
}

export function DonateModal({
  open,
  onClose,
  fighterName,
  fighterInitials,
  fundraiser,
  donorBalance = 0,
  busy = false,
  error,
  onDonate,
  onSuccess,
}: DonateModalProps) {
  const [screen, setScreen] = useState<Screen>("pick");
  const [amount, setAmount] = useState(300);
  const [amountMode, setAmountMode] = useState<AmountMode>("preset");
  const [comment, setComment] = useState("");
  const [donePayload, setDonePayload] = useState<DonationSuccessPayload | null>(null);
  const [mounted, setMounted] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && screen === "pick") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, screen]);

  useEffect(() => {
    if (open) {
      setScreen("pick");
      setAmount(300);
      setAmountMode("preset");
      setComment("");
      setDonePayload(null);
    }
  }, [open]);

  const handleAmountInput = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "");
    setAmount(digits ? Number.parseInt(digits, 10) : 0);
    setAmountMode("custom");
  }, []);

  const selectPreset = useCallback((preset: number) => {
    setAmount(preset);
    setAmountMode("preset");
  }, []);

  const selectCustom = useCallback(() => {
    setAmountMode("custom");
    window.setTimeout(() => amountInputRef.current?.focus(), 50);
  }, []);

  const breakdown = donateSettlement(amount);

  const runSbpPayment = useCallback(async () => {
    if (amount < 50 || busy || screen !== "pick") return;

    setScreen("sbp");

    await new Promise((r) => window.setTimeout(r, 1400));

    const result = await onDonate(amount, comment);

    if (!result) {
      setScreen("pick");
      return;
    }

    setDonePayload(result);
    onSuccess?.(result);
    setScreen("done");

    window.setTimeout(() => {
      onClose();
    }, 2200);
  }, [amount, busy, comment, onClose, onDonate, onSuccess, screen]);

  const isPresetActive = (preset: number) =>
    amountMode === "preset" && amount === preset;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#0A0A0A]/95 backdrop-blur-sm"
          onClick={screen === "pick" ? onClose : undefined}
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

            <AnimatePresence mode="wait">
              {screen === "sbp" ? (
                <motion.div
                  key="sbp"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 px-5 py-14"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10"
                  >
                    <SbpGlyph className="h-8 w-8" />
                  </motion.div>
                  <p className="font-[family-name:var(--font-geist-sans)] text-sm text-white">
                    Переход в приложение банка…
                  </p>
                  <p className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    СБП · {fmtRub.format(amount)}
                  </p>
                </motion.div>
              ) : screen === "done" ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 px-5 py-12 text-center"
                >
                  <span className="text-5xl">⚡</span>
                  <p className="text-lg font-bold text-white">Донат отправлен</p>
                  <p className="text-sm text-zinc-400">{fighterName}</p>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-sm text-emerald-200">
                    +{fmtRub.format(donePayload?.netRub ?? breakdown.net)} бойцу
                  </span>
                </motion.div>
              ) : (
                <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-4">
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

                  <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
                    Введите сумму доната
                  </p>

                  <div className="mt-3 flex items-baseline gap-1 border-b border-white/[0.12] pb-2">
                    <input
                      ref={amountInputRef}
                      type="text"
                      inputMode="numeric"
                      value={amount > 0 ? amount.toLocaleString("ru-RU") : ""}
                      onChange={(e) => handleAmountInput(e.target.value)}
                      onFocus={() => setAmountMode("custom")}
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
                        onClick={() => selectPreset(preset)}
                        className={
                          isPresetActive(preset)
                            ? "rounded-full border border-fuchsia-400/70 bg-fuchsia-500/15 px-3.5 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold text-fuchsia-200 shadow-[0_0_16px_-6px_rgba(232,121,249,0.8)]"
                            : "rounded-full border border-white/[0.1] bg-black/40 px-3.5 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                        }
                      >
                        {fmtRub.format(preset)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={selectCustom}
                      className={
                        amountMode === "custom"
                          ? "rounded-full border border-cyan-400/70 bg-cyan-500/15 px-3.5 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold text-cyan-200 shadow-[0_0_16px_-6px_rgba(34,211,238,0.6)]"
                          : "rounded-full border border-white/[0.1] bg-black/40 px-3.5 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-semibold text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                      }
                    >
                      Другая
                    </button>
                  </div>

                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Оставьте комментарий бойцу"
                    rows={2}
                    maxLength={280}
                    className="mt-5 w-full resize-none rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 font-[family-name:var(--font-geist-sans)] text-[13px] text-white placeholder:text-zinc-600 focus:border-fuchsia-400/40 focus:outline-none"
                  />

                  <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[8px] leading-relaxed uppercase tracking-[0.14em] text-zinc-600">
                    СБП · без регистрации · бойцу {fmtRub.format(breakdown.net)} · комиссия{" "}
                    {DONATION_PLATFORM_FEE_PCT}%
                    {donorBalance > 0
                      ? ` · баланс ${fmtRub.format(donorBalance)}`
                      : null}
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
                    onClick={() => void runSbpPayment()}
                    className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 py-4 font-[family-name:var(--font-geist-mono)] text-[11px] font-extrabold uppercase tracking-[0.22em] text-white transition-opacity disabled:opacity-45"
                    style={{ boxShadow: "0 0 28px -8px rgba(52,211,153,0.55)" }}
                  >
                    <SbpGlyph className="h-5 w-5" />
                    {busy ? "Обработка…" : "Перевести донат через СБП"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
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
