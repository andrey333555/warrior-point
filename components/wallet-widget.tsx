"use client";

import { type WalletData, calculateCashback } from "@/lib/loyalty";

type Props = {
  wallet: WalletData;
  isVIP: boolean;
  streak: number;
};

export default function WalletWidget({ wallet, isVIP, streak }: Props) {
  const totalAvailable = wallet.balance + wallet.bonusBalance;
  const nextCashback = calculateCashback(2000, isVIP, streak);

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="p-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, transparent 100%)",
        }}
      >
        <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
          Твой баланс
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">
            {totalAvailable.toLocaleString()}
          </span>
          <span className="text-sm text-white/40">₽</span>
        </div>
        <div className="mt-2 flex gap-4">
          <div>
            <p className="text-xs text-white/30">Кэшбэк</p>
            <p className="text-sm text-white/70">
              {wallet.balance.toLocaleString()} ₽
            </p>
          </div>
          <div>
            <p className="text-xs text-white/30">Бонусы</p>
            <p className="text-sm" style={{ color: "#C9A84C" }}>
              {wallet.bonusBalance.toLocaleString()} ₽
            </p>
          </div>
          {wallet.pendingCashback > 0 && (
            <div>
              <p className="text-xs text-white/30">Ожидает</p>
              <p className="text-sm text-white/50">
                +{wallet.pendingCashback.toLocaleString()} ₽
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className="px-4 py-3"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40">Кэшбэк за следующий сплит</p>
            <p className="text-sm font-medium" style={{ color: "#C9A84C" }}>
              +{nextCashback} ₽
              {isVIP && (
                <span className="ml-1 text-xs text-white/30">(VIP +3%)</span>
              )}
              {streak >= 7 && (
                <span className="ml-1 text-xs text-white/30">
                  (streak +{streak >= 14 ? "5" : "2"}%)
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Всего заработано</p>
            <p className="text-sm text-white/50">
              {wallet.totalCashback.toLocaleString()} ₽
            </p>
          </div>
        </div>
      </div>

      {wallet.referralEarnings > 0 && (
        <div
          className="px-4 py-3"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">👥</span>
            <p className="text-xs text-white/40">
              С рефералов:{" "}
              <span className="text-white/70">
                {wallet.referralEarnings.toLocaleString()} ₽
              </span>
            </p>
          </div>
        </div>
      )}

      <div
        className="px-4 py-3"
        style={{
          borderTop: "0.5px solid rgba(255,255,255,0.05)",
          background: "rgba(201,168,76,0.04)",
        }}
      >
        <p className="text-center text-xs text-white/50">
          💡 Тренируйся через Round 23 — копи кэшбэк и бонусы. Уходить = терять
          деньги.
        </p>
      </div>
    </div>
  );
}
