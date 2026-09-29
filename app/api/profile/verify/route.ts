import { NextResponse } from "next/server";
import { createWarriorServiceClient } from "@/lib/supabase/server-admin";
import { requireBoundUserId, isLiveEconomyLocked } from "@/lib/api-session";
import { hashedClientKey, jsonError, readJsonBody, safeDbMessage } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `verify:${hashedClientKey(req)}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const parsed = await readJsonBody<{ profileId?: string; fileName?: string }>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);

  const claimed = parsed.body.profileId?.trim() ?? "";
  const bound = await requireBoundUserId(claimed || null);
  if (!bound.ok) {
    return jsonError(bound.message, bound.status);
  }
  const profileId = bound.userId;

  const fileName = parsed.body.fileName?.trim() ?? "";
  if (!fileName || fileName.length > 200) {
    return jsonError("Загрузите файл документа", 400);
  }
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(fileName)) {
    return jsonError("Допустимы PDF, JPG, PNG, WEBP", 400);
  }

  const sb = createWarriorServiceClient();
  if (!sb) {
    if (isLiveEconomyLocked()) {
      return jsonError("Нужен SUPABASE_SERVICE_ROLE_KEY", 503);
    }
    return NextResponse.json({
      ok: true,
      mock: true,
      status: "pending",
      message: "Заявка принята (demo). AI-проверка — в backlog.",
    });
  }

  const { error } = await sb
    .from("profiles")
    .update({
      verification_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    return jsonError(safeDbMessage(error.message), 502);
  }

  return NextResponse.json({
    ok: true,
    status: "pending",
    message: "Документ принят. Статус: на проверке (AI-KYC stub).",
  });
}
