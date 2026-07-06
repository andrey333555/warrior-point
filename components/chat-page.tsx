"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { DEFAULT_TRAINER_IMAGE, type Trainer } from "@/lib/network";
import { useBookings } from "@/lib/bookings";
import { hasChatAccess, useChat, type ChatMessage } from "@/lib/chat";
import { Button } from "@/components/ui/button";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg, trainerImage }: { msg: ChatMessage; trainerImage?: string }) {
  if (msg.role === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-3 flex justify-center"
      >
        <span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] text-gray-500">
          {msg.text}
        </span>
      </motion.div>
    );
  }

  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser ? (
        <div className="mb-1 h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trainerImage || DEFAULT_TRAINER_IMAGE}
            alt=""
            className="h-full w-full object-cover object-[center_15%]"
          />
        </div>
      ) : null}

      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-sm bg-yellow-400 text-black"
              : "rounded-bl-sm border border-zinc-800 bg-zinc-900 text-white"
          }`}
        >
          {msg.text}
        </div>
        <p className="mt-1 px-1 text-[10px] text-gray-700">{fmtTime(msg.ts)}</p>
      </div>
    </motion.div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ trainerImage }: { trainerImage?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-end gap-2"
    >
      <div className="mb-1 h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={trainerImage || DEFAULT_TRAINER_IMAGE} alt="" className="h-full w-full object-cover object-[center_15%]" />
      </div>
      <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-zinc-800 bg-zinc-900 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.18 }}
            className="h-1.5 w-1.5 rounded-full bg-gray-500"
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Locked state ──────────────────────────────────────────────────────────────

function LockedChat({ trainer, onPay }: { trainer: Trainer; onPay: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-2xl">
        🔒
      </div>
      <div>
        <p className="font-semibold text-white">Чат недоступен</p>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          Чат с тренером открывается после подтверждения и оплаты тренировки
        </p>
      </div>
      <Button fullWidth size="lg" onClick={onPay}>
        Оплатить тренировку
      </Button>
    </div>
  );
}

// ── Main chat ─────────────────────────────────────────────────────────────────

export default function ChatPage({ trainer }: { trainer: Trainer }) {
  const router = useRouter();
  const bookings = useBookings();
  const hasAccess = useMemo(
    () => hasChatAccess(trainer.id, trainer.name),
    [bookings, trainer.id, trainer.name],
  );
  const { messages, typing, sendMessage } = useChat(trainer);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto flex h-[100dvh] max-w-lg flex-col bg-black text-white">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
        >
          ←
        </button>

        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trainer.image || DEFAULT_TRAINER_IMAGE}
            alt={trainer.name}
            className="h-full w-full object-cover object-[center_15%]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{trainer.name}</p>
          <p className="text-[10px] text-gray-500">
            {hasAccess ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Доступен
              </span>
            ) : (
              "Требуется оплата"
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/trainer/${trainer.id}`)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Профиль →
        </button>
      </header>

      {/* ── Body ── */}
      {!hasAccess ? (
        <LockedChat trainer={trainer} onPay={() => router.push(`/booking/${trainer.id}`)} />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <Bubble key={msg.id} msg={msg} trainerImage={trainer.image} />
              ))}
              {typing ? (
                <TypingIndicator key="typing" trainerImage={trainer.image} />
              ) : null}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="border-t border-white/[0.07] bg-zinc-950 px-4 py-3">
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Написать тренеру…"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder-zinc-600"
              />
              <Button
                size="sm"
                disabled={!input.trim()}
                onClick={handleSend}
                className="h-8 w-8 shrink-0 rounded-full p-0"
                aria-label="Отправить"
              >
                ↑
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
