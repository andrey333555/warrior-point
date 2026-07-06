"use client";

import { useEffect, useRef, useState } from "react";
import { type Trainer } from "@/lib/network";
import { getBookings } from "@/lib/bookings";
import { saveData, loadData, STORAGE_KEYS } from "@/lib/storage";

export type MessageRole = "user" | "trainer" | "system";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
  ts: number;
};

// ── Access check ──────────────────────────────────────────────────────────────

/** Chat opens after a paid upcoming booking with this trainer. */
export function hasChatAccess(trainerId: number, trainerName?: string): boolean {
  try {
    return getBookings().some(
      (b) =>
        b.status === "upcoming" &&
        (b.trainerId === trainerId ||
          (!!trainerName && b.trainerName === trainerName)),
    );
  } catch {
    return false;
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────

function loadMessages(trainerId: number): ChatMessage[] {
  try {
    const raw = loadData<unknown>(STORAGE_KEYS.chat(trainerId), []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        typeof (m as ChatMessage).id === "string" &&
        typeof (m as ChatMessage).text === "string" &&
        typeof (m as ChatMessage).ts === "number",
    );
  } catch {
    return [];
  }
}

function saveMessages(trainerId: number, messages: ChatMessage[]): void {
  try {
    saveData(STORAGE_KEYS.chat(trainerId), messages);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[chat] saveMessages failed:", err);
    }
  }
}

// ── Mock trainer responses ────────────────────────────────────────────────────

const TRAINER_REPLIES = [
  "Отлично, жду тебя! Приходи заряженным.",
  "Хорошо. Если что-то изменится — напиши заранее.",
  "Понял. Подготовим программу под тебя.",
  "Договорились. Возьми воду и удобную форму.",
  "Принял. Разберём всё на тренировке.",
  "Ок. Будь готов — будем работать интенсивно.",
];

let replyIndex = 0;

function nextTrainerReply(): string {
  const reply = TRAINER_REPLIES[replyIndex % TRAINER_REPLIES.length]!;
  replyIndex++;
  return reply;
}

function makeId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function seedMessages(): ChatMessage[] {
  return [
    {
      id: makeId(),
      role: "system",
      text: "✅ Ты записан. Напиши тренеру, если есть вопросы.",
      ts: Date.now() - 60_000,
    },
    {
      id: makeId(),
      role: "trainer",
      text: "Привет! Жду тебя. Если есть вопросы перед тренировкой — пиши, отвечу.",
      ts: Date.now() - 55_000,
    },
  ];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChat(trainer: Trainer) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const initialized = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const stored = loadMessages(trainer.id);

      if (stored.length === 0) {
        const init = seedMessages();
        saveMessages(trainer.id, init);
        setMessages(init);
      } else {
        setMessages(stored);
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[chat] init failed:", err);
      }
      setMessages([]);
    }
  }, [trainer.id]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      text: trimmed,
      ts: Date.now(),
    };

    try {
      const updated = [...messagesRef.current, userMsg];
      messagesRef.current = updated;
      setMessages(updated);
      saveMessages(trainer.id, updated);

      setTyping(true);
      const delay = 1200 + Math.random() * 800;
      setTimeout(() => {
        try {
          const trainerMsg: ChatMessage = {
            id: makeId(),
            role: "trainer",
            text: nextTrainerReply(),
            ts: Date.now(),
          };
          const withReply = [...messagesRef.current, trainerMsg];
          messagesRef.current = withReply;
          setMessages(withReply);
          saveMessages(trainer.id, withReply);
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[chat] reply failed:", err);
          }
        } finally {
          setTyping(false);
        }
      }, delay);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[chat] sendMessage failed:", err);
      }
    }
  };

  return { messages, typing, sendMessage };
}
