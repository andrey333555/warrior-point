import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { requireBoundUserId } from "@/lib/api-session";
import { hashedClientKey, jsonError, readJsonBody, safeDbMessage } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";

type Body = {
  code?: string;
  /** Only honoured without a session in demo mode — never trusted in prod. */
  userId?: string;
};

type RedeemRow = {
  ok?: boolean;
  already_granted?: boolean;
  amount?: number | string;
  new_balance?: number | string;
  inviter_id?: string | null;
  inviter_xp?: number | string;
  message?: string;
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function firstRow(data: unknown): RedeemRow | null {
  if (Array.isArray(data)) {
    return (data[0] as RedeemRow) ?? null;
  }
  if (data && typeof data === "object") return data as RedeemRow;
  return null;
}

/** RPC-сообщения — внутренние строки, не текст ошибок БД. Переводим для UI. */
function explain(message: string): { status: number; text: string } {
  if (/not found/i.test(message)) {
    return { status: 404, text: "Код не найден" };
  }
  if (/already used/i.test(message)) {
    return { status: 409, text: "Этот инвайт уже использован" };
  }
  if (/limit reached/i.test(message)) {
    return { status: 409, text: "Бонусы по этому коду закончились" };
  }
  if (/already received/i.test(message)) {
    return { status: 409, text: "Приветственный бонус уже начислен" };
  }
  if (/self invite/i.test(message)) {
    return { status: 409, text: "Нельзя активировать свой же инвайт" };
  }
  return { status: 400, text: "Инвайт недействителен" };
}

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `bonus-redeem:${hashedClientKey(req)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много попыток", 429);

  const parsed = await readJsonBody<Body>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);

  const code = parsed.body.code?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9][A-Z0-9-]{3,31}$/.test(code)) {
    return jsonError("Некорректный код", 400);
  }

  // Личность берём из сессии. Клиентский userId живёт только в demo-режиме.
  const actor = await requireBoundUserId(parsed.body.userId);
  if (!actor.ok) return jsonError(actor.message, actor.status);

  const sb = createWarriorServiceClient();
  if (!sb) {
    return jsonError("Сервер не настроен (нужен SUPABASE_SERVICE_ROLE_KEY)", 503);
  }

  const { data, error } = await sb.rpc("wp_redeem_invite_bonus", {
    p_code: code,
    p_user_id: actor.userId,
  });

  if (error) {
    if (/could not find the function|schema cache|does not exist|42883/i.test(error.message)) {
      return jsonError("Сервер не готов · примените миграцию 0027", 503);
    }
    return jsonError(safeDbMessage(error.message), 502);
  }

  const row = firstRow(data);
  if (!row) return jsonError("Пустой ответ начисления", 502);

  if (!row.ok) {
    const reason = explain(row.message ?? "");
    return jsonError(reason.text, reason.status);
  }

  return NextResponse.json({
    success: true,
    alreadyGranted: row.already_granted === true,
    bonus: num(row.amount),
    newBalance: num(row.new_balance),
    inviterXp: num(row.inviter_xp),
  });
}
