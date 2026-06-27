"use client";

/**
 * AiAssistantOverlay — compact chat for halls, fighter profiles, insurance.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ChatMessage = { role: "user" | "assistant"; text: string };

const QUICK_TOPICS = [
  { id: "halls", label: "Залы" },
  { id: "profiles", label: "Профили" },
  { id: "insurance", label: "Страховка" },
] as const;

function buildReply(input: string): string {
  const q = input.toLowerCase();

  if (/зал|hall|карта|hub|локац/i.test(q)) {
    return (
      "Структура залов Warrior Point: глобальная карта хабов → карточка зала (IRON WILL) → " +
      "сплит-бронирование 2000 ₽ (19% платформа · 81% тренер). Фильтр по дисциплине и ELO-зоне. " +
      "Открой MAP в нижней навигации для live-геолокации."
    );
  }

  if (/профил|боец|passport|elo|ранг|sherdog/i.test(q)) {
    return (
      "Warrior Passport: глобальный ID, ELO-рейтинг, 23 ранга (Grandmaster = 23), Combat Score, " +
      "рекорд W-L-D и Sherdog-sync. Профиль бойца агрегирует лиги (ACA · RCC · FN · UFC) и витальные метрики."
    );
  }

  if (/страх|insur|комисс|19%|покрыт/i.test(q)) {
    return (
      "Страховка платформы: 19% с каждой транзакции покрывает инфраструктуру и страховой пул бойца. " +
      "Статус «АКТИВНА» в регалиях Metatron означает действующее покрытие на текущий период."
    );
  }

  if (/iphone|билет|подар|ticket|reward/i.test(q)) {
    return (
      "Билеты iPhone начисляются за сплиты и streak-активность. При hasReward=true в круге Metatron " +
      "отображается неоновый значок подарка вместо числовой метрики."
    );
  }

  return (
    "Спроси про залы (карта / сплиты), профили бойцов (ELO · ранги · Sherdog) или страховку (19% комиссия). " +
    "Используй быстрые кнопки выше."
  );
}

function AiGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        d="M12 3 L12 8 M8 6 L12 3 L16 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="5" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="14" r="1" fill="currentColor" />
      <circle cx="15" cy="14" r="1" fill="currentColor" />
      <path d="M9 17 H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

type AiAssistantButtonProps = {
  accent?: string;
  className?: string;
};

export function AiAssistantButton({ accent = "#00F0FF", className = "" }: AiAssistantButtonProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "ИИ-Ассистент Warrior Point. Залы, профили бойцов, страховка — задай вопрос или выбери тему.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "assistant", text: buildReply(trimmed) },
    ]);
    setInput("");
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="ИИ-Ассистент"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-white/[0.04] ${className}`}
        style={{
          borderColor: `${accent}55`,
          background: `${accent}12`,
          boxShadow: open ? `0 0 16px -4px ${accent}` : `0 0 10px -6px ${accent}80`,
          color: accent,
        }}
      >
        <AiGlyph className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-start justify-center bg-black/60 p-3 pt-14 backdrop-blur-sm sm:pt-16"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[min(420px,70dvh)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0a12]/95 shadow-[0_0_40px_-12px_rgba(0,240,255,0.35)]"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-md border"
                    style={{ borderColor: `${accent}44`, color: accent, background: `${accent}10` }}
                  >
                    <AiGlyph className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                      ИИ · Assistant
                    </p>
                    <p className="font-[family-name:var(--font-geist-mono)] text-[7px] uppercase tracking-[0.28em] text-zinc-500">
                      Залы · Профили · Страховка
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Закрыть"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/[0.12] px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-wider text-zinc-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="flex gap-1.5 border-b border-white/[0.06] px-3 py-2">
                {QUICK_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => send(t.label)}
                    className="rounded-full border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={m.role === "user" ? "text-right" : "text-left"}
                  >
                    <p
                      className={`inline-block max-w-[92%] rounded-xl px-2.5 py-2 text-left font-[family-name:var(--font-geist-sans)] text-[11px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-fuchsia-500/15 text-fuchsia-100"
                          : "bg-white/[0.04] text-zinc-300"
                      }`}
                    >
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>

              <form
                className="flex gap-2 border-t border-white/[0.08] p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Спроси про залы или страховку…"
                  className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2 font-[family-name:var(--font-geist-sans)] text-[12px] text-white placeholder:text-zinc-600 focus:border-cyan-400/40 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="shrink-0 rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200 disabled:opacity-40"
                >
                  →
                </button>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
