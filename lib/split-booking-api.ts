"use client";

import type { BookSplitResult } from "@/lib/supabase/split-booking";

/**
 * Book a split seat through the server route (`/api/splits/book`).
 * The server debits balance / credits the coach with the service-role key,
 * so the browser anon key stays read-only for the economy tables.
 */
export async function bookSplitSeat(opts: {
  clientId: string;
  splitId: string;
}): Promise<BookSplitResult> {
  try {
    const res = await fetch("/api/splits/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });

    const data = (await res.json()) as
      | (Extract<BookSplitResult, { ok: true }> & { ok: true })
      | { ok: false; code?: Extract<BookSplitResult, { ok: false }>["code"]; message?: string };

    if (data.ok) return data;

    return {
      ok: false,
      code: data.code ?? "DB_ERROR",
      message: data.message ?? "Не удалось записаться на сплит",
    };
  } catch {
    return {
      ok: false,
      code: "DB_ERROR",
      message: "Сервер недоступен · попробуй ещё раз",
    };
  }
}
