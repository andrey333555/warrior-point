import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { isDemoEconomyAllowed, isLiveEconomyLocked } from "@/lib/api-session";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_JSON_BODY_BYTES = 32_768;

export type JsonBodyResult<T> =
  | { ok: true; body: T }
  | { ok: false; status: number; message: string };

export async function readJsonBody<T>(
  req: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<JsonBodyResult<T>> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, message: "Слишком большой запрос" };
  }

  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    return { ok: false, status: 413, message: "Слишком большой запрос" };
  }

  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(buf)) as T };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON" };
  }
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, message }, { status });
}

export function safeDbMessage(raw: string | undefined): string {
  if (!raw) return "Ошибка сервера";
  if (/permission denied|row-level security|RLS/i.test(raw)) {
    return "Нет доступа";
  }
  if (/duplicate|unique|23505/i.test(raw)) {
    return "Уже обработано";
  }
  if (/does not exist|42883|schema cache/i.test(raw)) {
    return "Сервер не готов · примените миграции";
  }
  return "Не удалось выполнить операцию";
}

/** HMAC of client IP — never store the raw address. */
export function hashedClientKey(req: Request, extra = ""): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "0";
  const secret =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.CHECKIN_SECRET?.trim() ||
    "wp-dev-rate-limit";
  return createHmac("sha256", secret)
    .update(`${ip}:${extra}`)
    .digest("hex")
    .slice(0, 24);
}

/**
 * Production writes require the service role. Demo may fall back to anon.
 */
export function requireWriteClient():
  | { ok: true; client: SupabaseClient }
  | { ok: false; status: number; message: string } {
  const service = createWarriorServiceClient();
  if (service) return { ok: true, client: service };

  if (isLiveEconomyLocked()) {
    return {
      ok: false,
      status: 503,
      message: "Сервер не настроен (нужен SUPABASE_SERVICE_ROLE_KEY)",
    };
  }

  if (!isDemoEconomyAllowed()) {
    return {
      ok: false,
      status: 503,
      message: "Supabase не настроен",
    };
  }

  const anon = createWarriorBrowserClient();
  if (!anon) {
    return { ok: false, status: 503, message: "Supabase не настроен" };
  }
  return { ok: true, client: anon };
}
