"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AuthView } from "@/components/auth/AuthView";
import { useWarriorAuth } from "@/hooks/use-warrior-auth";
import {
  clampBonus,
  clearPendingBonus,
  getPendingBonus,
  savePendingBonus,
} from "@/lib/invite-bonus";

type RedeemState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "done"; bonus: number }
  | { phase: "failed"; message: string };

export default function LoginPage() {
  const searchParams = useSearchParams();
  const auth = useWarriorAuth();
  const [storedBonus, setStoredBonus] = useState<number | null>(null);
  const [redeem, setRedeem] = useState<RedeemState>({ phase: "idle" });
  const attempted = useRef(false);

  const inviteFromUrl = searchParams.get("invite")?.trim().toUpperCase() || null;
  const bonusFromUrl = inviteFromUrl ? clampBonus(searchParams.get("bonus")) : null;

  // ?invite= пришёл из попапа — дублируем в localStorage, ссылку могли переслать.
  useEffect(() => {
    if (inviteFromUrl && bonusFromUrl) {
      savePendingBonus(inviteFromUrl, bonusFromUrl);
      return;
    }
    const pending = getPendingBonus();
    setStoredBonus(pending ? pending.amount : null);
  }, [inviteFromUrl, bonusFromUrl]);

  const bonusHint = bonusFromUrl ?? storedBonus;

  const runRedeem = useCallback(async (code: string) => {
    setRedeem({ phase: "sending" });
    try {
      // userId не отправляем: сервер берёт личность из сессии.
      const res = await fetch("/api/bonus/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        bonus?: number;
        message?: string;
      };

      if (data.success) {
        clearPendingBonus();
        setRedeem({ phase: "done", bonus: data.bonus ?? 0 });
        window.setTimeout(() => {
          window.location.href = "/?tab=passport";
        }, 1200);
        return;
      }

      // Чистим только если мёртв сам код. 401/403/5xx — бонус ещё ждёт.
      if (res.status === 404 || res.status === 409) clearPendingBonus();
      setRedeem({
        phase: "failed",
        message: data.message ?? "Бонус не начислен",
      });
    } catch {
      setRedeem({ phase: "failed", message: "Сеть недоступна · бонус сохранён" });
    }
  }, []);

  useEffect(() => {
    if (attempted.current) return;
    if (auth.status !== "authenticated") return;
    // Гостевой режим — это не регистрация, бонус ждёт настоящий аккаунт.
    if (auth.guestMode) return;

    const pending = getPendingBonus();
    if (!pending) return;

    attempted.current = true;
    void runRedeem(pending.code);
  }, [auth, runRedeem]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-blue-500/20 blur-xl"
        />
      </div>

      {bonusHint ? (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mb-4 w-full max-w-[360px] rounded-2xl border border-[#C9A84C]/40 px-4 py-3 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(201,168,76,0.18), rgba(74,222,128,0.08))",
            boxShadow: "0 0 32px -12px rgba(201,168,76,0.5)",
          }}
        >
          <p className="text-sm font-bold text-white">
            🎁 Тебя ждёт подарок +{bonusHint} ₽ после регистрации
          </p>
          {redeem.phase === "sending" ? (
            <p className="mt-1 text-[11px] text-white/50">Начисляем бонус…</p>
          ) : redeem.phase === "done" ? (
            <p className="mt-1 text-[11px] text-green-400">
              +{redeem.bonus} ₽ на балансе · открываем паспорт
            </p>
          ) : redeem.phase === "failed" ? (
            <p className="mt-1 text-[11px] text-red-300">{redeem.message}</p>
          ) : (
            <p className="mt-1 text-[11px] text-white/50">
              Зарегистрируйся — бонус зачислим сразу
            </p>
          )}
        </motion.div>
      ) : null}

      <div className="relative z-10">
        <AuthView />
      </div>
    </main>
  );
}
