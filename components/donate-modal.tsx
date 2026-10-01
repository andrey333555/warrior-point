"use client";

/**
 * DonateModal — bottom sheet for SBP tip (pre-YooKassa).
 * Presets 300/500/1000/5000 + «Другая».
 * Commission from campaign.commission_percent via coverCommissionBreakdown.
 * Does NOT call payment APIs or insert donations until YooKassa is live.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { FundraiserProgress } from "@/lib/supabase/donations";
import {
  DEFAULT_CAMPAIGN_COMMISSION_PERCENT,
  FUNDRAISING_QUICK_AMOUNTS,
  coverCommissionBreakdown,
} from "@/lib/fundraising-campaign";

const QUICK_AMOUNTS = FUNDRAISING_QUICK_AMOUNTS;

const fmtRub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

type Screen = "pick" | "transfer";
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

/** @deprecated Kept for call-site types; modal no longer triggers payment. */
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
  /** @deprecated hex initials are no longer shown */
  fighterInitials?: string;
  /** Real photo URL; dark placeholder when missing */
  avatarUrl?: string | null;
  /** SBP phone from profiles.sbp_phone — never invent */
  sbpPhone?: string | null;
  /** Bank name from profiles.sbp_bank — never invent */
  sbpBank?: string | null;
  fundraiser: FundraiserProgress;
  /**
   * From server PAYMENTS_PROVIDER=yookassa.
   * manual/unset → hide commission checkbox and all commission math.
   */
  commissionUiEnabled?: boolean;
  busy?: boolean;
  error?: string | null;
  /** Unused until YooKassa — kept so callers compile */
  onDonate?: DonatePaymentHandler;
  onSuccess?: DonateSuccessHandler;
  initialAmount?: number;
}

export function DonateModal({
  open,
  onClose,
  fighterName,
  avatarUrl = null,
  sbpPhone = null,
  sbpBank = null,
  fundraiser,
  commissionUiEnabled = false,
  error,
  initialAmount,
}: DonateModalProps) {
  const [screen, setScreen] = useState<Screen>("pick");
  const [amount, setAmount] = useState(300);
  const [amountMode, setAmountMode] = useState<AmountMode>("preset");
  const [comment, setComment] = useState("");
  const [coverFee, setCoverFee] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const commissionPercent =
    typeof fundraiser.commissionPercent === "number"
      ? fundraiser.commissionPercent
      : DEFAULT_CAMPAIGN_COMMISSION_PERCENT;
  /** Provider flag + real 0% in DB both hide the checkbox. */
  const showCommissionUi = commissionUiEnabled && commissionPercent > 0;
  const showGoal = fundraiser.goalRub > 0;
  const photoSrc =
    typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
  const phone =
    typeof sbpPhone === "string" && sbpPhone.trim() ? sbpPhone.trim() : null;
  const bank =
    typeof sbpBank === "string" && sbpBank.trim() ? sbpBank.trim() : null;
  const hasSbp = Boolean(phone);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (open) {
      setScreen("pick");
      const preset =
        initialAmount && initialAmount >= 50 ? initialAmount : 300;
      setAmount(preset);
      setAmountMode(
        (QUICK_AMOUNTS as readonly number[]).includes(preset)
          ? "preset"
          : "custom",
      );
      setComment("");
      setCoverFee(true);
      setCopied(false);
    }
  }, [open, initialAmount]);

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

  const breakdown = coverCommissionBreakdown(
    amount,
    showCommissionUi ? commissionPercent : 0,
    showCommissionUi && coverFee,
  );

  const openTransfer = useCallback(() => {
    if (amount < 50) return;
    setScreen("transfer");
    setCopied(false);
  }, [amount]);

  const copyPhone = useCallback(async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [phone]);

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
              boxShadow: "0 -12px 80px -16px rgba(201,168,76,0.35)",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="flex justify-center pt-2.5">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            <AnimatePresence mode="wait">
              {screen === "transfer" ? (
                <motion.div
                  key="transfer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-5 pb-6 pt-4"
                >
                  <button
                    type="button"
                    onClick={() => setScreen("pick")}
                    className="mb-4 text-[10px] uppercase tracking-[0.16em] text-white/45"
                  >
                    ← Назад
                  </button>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                      {photoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoSrc}
                          alt={fighterName}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {fighterName}
                      </p>
                      <p className="mt-0.5 text-xs text-white/45">Перевод по СБП</p>
                    </div>
                  </div>

                  <p className="mt-5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Сумма перевода
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-white">
                    {fmtRub.format(breakdown.payRub)}
                  </p>
                  {showCommissionUi ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      К оплате {fmtRub.format(breakdown.payRub)} · бойцу{" "}
                      {fmtRub.format(breakdown.fighterRub)}
                    </p>
                  ) : null}

                  {hasSbp ? (
                    <div className="mt-5 space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                          Телефон СБП
                        </p>
                        <p className="mt-1 font-[family-name:var(--font-jetbrains-mono)] text-lg font-bold text-white">
                          {phone}
                        </p>
                      </div>
                      {bank ? (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                            Банк
                          </p>
                          <p className="mt-1 text-sm text-white/85">{bank}</p>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void copyPhone()}
                        className="w-full rounded-xl border border-[#C9A84C]/50 bg-[#C9A84C]/15 py-3 text-sm font-semibold text-[#C9A84C]"
                      >
                        {copied ? "Скопировано" : "Скопировать номер"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/55">
                      Боец ещё не добавил реквизиты СБП
                    </p>
                  )}

                  {comment.trim() ? (
                    <p className="mt-4 text-xs text-zinc-500">
                      Комментарий: {comment.trim()}
                    </p>
                  ) : null}

                  <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
                    Оплата через ЮKassa пока не подключена. Переведите сумму
                    вручную в приложении банка — платформа не подтверждает
                    перевод автоматически.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-4 pb-6">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                      {photoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoSrc}
                          alt={fighterName}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-[family-name:var(--font-geist-sans)] text-[14px] font-semibold text-white">
                        {fighterName}
                      </p>
                      {showGoal ? (
                        <>
                          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                            собрано {fmtRub.format(fundraiser.raisedRub)} из{" "}
                            {fmtRub.format(fundraiser.goalRub)}
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-yellow-300"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.max(fundraiser.pct, fundraiser.raisedRub > 0 ? 1 : 0)}%`,
                              }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                          {fundraiser.raisedRub === 0 ? (
                            <p className="mt-1.5 text-[11px] font-medium text-[#C9A84C]/90">
                              Будь первым
                            </p>
                          ) : null}
                        </>
                      ) : null}
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
                            ? "rounded-full border border-[#C9A84C]/70 bg-[#C9A84C]/15 px-3.5 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold text-[#C9A84C]"
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
                          ? "rounded-full border border-cyan-400/70 bg-cyan-500/15 px-3.5 py-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-bold text-cyan-200"
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
                    className="mt-5 w-full resize-none rounded-xl border border-white/[0.1] bg-black/50 px-3.5 py-3 font-[family-name:var(--font-geist-sans)] text-[13px] text-white placeholder:text-zinc-600 focus:border-[#C9A84C]/40 focus:outline-none"
                  />

                  {showCommissionUi ? (
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                      <input
                        type="checkbox"
                        checked={coverFee}
                        onChange={(e) => setCoverFee(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#C9A84C]"
                      />
                      <span className="text-sm text-white/85">
                        Покрыть комиссию ({commissionPercent}%)
                      </span>
                    </label>
                  ) : null}

                  {showCommissionUi ? (
                    <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[11px] text-zinc-400">
                      К оплате {fmtRub.format(breakdown.payRub)} · бойцу{" "}
                      {fmtRub.format(breakdown.fighterRub)}
                    </p>
                  ) : null}

                  {error ? (
                    <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] text-rose-400">
                      {error}
                    </p>
                  ) : null}

                  <motion.button
                    type="button"
                    disabled={amount < 50}
                    whileTap={{ scale: 0.98 }}
                    onClick={openTransfer}
                    className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[#C9A84C]/50 bg-gradient-to-r from-[#C9A84C]/25 via-[#C9A84C]/15 to-yellow-500/20 py-4 font-[family-name:var(--font-geist-mono)] text-[11px] font-extrabold uppercase tracking-[0.22em] text-white transition-opacity disabled:opacity-45"
                    style={{ boxShadow: "0 0 28px -8px rgba(201,168,76,0.55)" }}
                  >
                    <SbpGlyph className="h-5 w-5" />
                    Перевести через СБП
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
      className="flex w-full max-w-[320px] items-center justify-center gap-2.5 rounded-2xl border border-[#C9A84C]/50 bg-gradient-to-r from-[#C9A84C]/15 via-black/60 to-yellow-500/12 px-5 py-4 font-[family-name:var(--font-geist-mono)] text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C9A84C]"
      style={{ boxShadow: "0 0 36px -10px rgba(201,168,76,0.5)" }}
    >
      <SbpGlyph className="h-5 w-5" />
      Поддержать бойца (СБП)
    </motion.button>
  );
}
