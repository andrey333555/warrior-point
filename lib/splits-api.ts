"use client";

/**
 * Create/cancel a split through the server routes (`/api/splits/create`,
 * `/api/splits/cancel`). Both are session-bound and role-gated server-side,
 * so the browser anon key stays read-only for `training_splits`.
 */
export async function createSplitViaApi(opts: {
  coachId: string;
  topic: string;
  pricePerSeat: number;
  maxSeats: number;
}): Promise<{ id: string | null; error: Error | null }> {
  try {
    const res = await fetch("/api/splits/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    const data = (await res.json()) as {
      ok: boolean;
      id?: string;
      message?: string;
    };
    if (!data.ok) {
      return { id: null, error: new Error(data.message ?? "Не удалось создать сплит") };
    }
    return { id: data.id ?? null, error: null };
  } catch {
    return { id: null, error: new Error("Сервер недоступен · попробуй ещё раз") };
  }
}

export async function cancelSplitViaApi(opts: {
  coachId: string;
  splitId: string;
}): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/splits/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    if (!data.ok) {
      return { error: new Error(data.message ?? "Не удалось отменить сплит") };
    }
    return { error: null };
  } catch {
    return { error: new Error("Сервер недоступен · попробуй ещё раз") };
  }
}
