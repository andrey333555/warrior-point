"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Clock, Users, Check } from "lucide-react";

interface InviteBonusPopupProps {
  inviterName?: string;
  inviterAvatar?: string;
  inviteCode?: string;
  bonusAmount?: number;
  expiresInHours?: number;
  totalRedeemed?: number;
  onClaim: () => void;
  onDismiss: () => void;
  onWrongInvite: () => void;
}

function splitTime(totalMs: number) {
  const remaining = Math.max(0, totalMs);
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

export default function InviteBonusPopup({
  inviterName = "Сергей Р.",
  inviterAvatar,
  inviteCode = "COBRA-5429",
  bonusAmount = 300,
  expiresInHours = 24,
  totalRedeemed = 4231,
  onClaim,
  onDismiss,
  onWrongInvite,
}: InviteBonusPopupProps) {
  const [timeLeft, setTimeLeft] = useState(() =>
    splitTime(expiresInHours * 60 * 60 * 1000),
  );

  useEffect(() => {
    const endTime = Date.now() + expiresInHours * 60 * 60 * 1000;
    const tick = () => setTimeLeft(splitTime(endTime - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresInHours]);

  const bonusUses = [
    "Первая тренировка со скидкой",
    "Донат любимому бойцу",
    "Ускорение прокачки XP",
  ];

  const initial = (inviterName.trim()[0] || "?").toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto w-full max-w-md rounded-3xl border border-yellow-400/40 bg-gradient-to-br from-gray-900 via-gray-900 to-black p-6 shadow-2xl shadow-yellow-400/20"
    >
      <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-yellow-400">
        Warrior Point
      </p>

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-800/50 p-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
          {inviterAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inviterAvatar}
              alt={inviterName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-black">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400">Тебя пригласил</p>
          <p className="truncate font-bold text-white">{inviterName}</p>
        </div>
        <div className="text-2xl text-yellow-400">🥊</div>
      </div>

      <h2 className="mb-2 text-center text-2xl font-bold text-white">
        Тебя ждут на ковре
      </h2>
      <p className="mb-5 text-center text-sm text-gray-400">
        Забери бонус и начни первую тренировку —<br />
        это твой момент.
      </p>

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-green-500/50 bg-gradient-to-br from-green-900/40 to-green-950/30 p-5">
        <div className="absolute top-0 right-0 flex items-center gap-1 rounded-bl-2xl bg-orange-500 px-3 py-1 text-xs font-bold text-black">
          <Clock size={12} />
          <span>
            {String(timeLeft.hours).padStart(2, "0")}ч{" "}
            {String(timeLeft.minutes).padStart(2, "0")}м
          </span>
        </div>

        <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-green-400">
          Подарок на старт
        </p>
        <p className="mb-2 text-center text-5xl font-bold text-white">
          +{bonusAmount} ₽
        </p>
        <p className="text-center font-mono text-xs text-gray-500">{inviteCode}</p>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Можно потратить на:
        </p>
        <div className="space-y-2">
          {bonusUses.map((use) => (
            <div key={use} className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={14} className="flex-shrink-0 text-green-400" />
              <span>{use}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <Users size={12} />
        <span>
          <span className="font-semibold text-white">
            {totalRedeemed.toLocaleString("ru-RU")}
          </span>{" "}
          бойцов уже забрали бонус
        </span>
      </div>

      <button
        type="button"
        onClick={onClaim}
        className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 py-4 font-bold text-black shadow-lg transition-all hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-400/50 active:scale-[0.98]"
      >
        <Gift size={20} />
        <span>Забрать бонус и тренироваться</span>
      </button>

      <button
        type="button"
        onClick={onDismiss}
        className="w-full py-2 text-sm text-gray-500 transition-colors hover:text-gray-300"
      >
        Позже
      </button>

      <button
        type="button"
        onClick={onWrongInvite}
        className="w-full py-1 text-xs text-gray-600 transition-colors hover:text-gray-500"
      >
        Это не мой инвайт
      </button>
    </motion.div>
  );
}
