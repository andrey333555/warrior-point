import { NextResponse } from "next/server";
import {
  buildServerTrainerOfflineQr,
  isCheckinSecretConfigured,
} from "@/lib/checkin-server";
import { formatCodeDisplay } from "@/lib/verify";
import { requireBoundUserId, isLiveEconomyLocked } from "@/lib/api-session";
import { hashedClientKey, jsonError } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = rateLimit({
    key: `checkin-qr:${hashedClientKey(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const { searchParams } = new URL(req.url);
  const trainerId = searchParams.get("trainerId")?.trim() ?? "";
  const gymId = (searchParams.get("gymId")?.trim() ?? "gym").slice(0, 64);

  if (!trainerId || trainerId.length > 64) {
    return jsonError("trainerId обязателен", 400);
  }

  const bound = await requireBoundUserId(trainerId);
  if (!bound.ok) {
    return jsonError(bound.message, bound.status);
  }

  if (!isCheckinSecretConfigured()) {
    if (isLiveEconomyLocked()) {
      return jsonError("Check-in не настроен (нужен CHECKIN_SECRET)", 503);
    }
    return NextResponse.json({ ok: true, configured: false });
  }

  const payload = buildServerTrainerOfflineQr(bound.userId, gymId);
  if (!payload) {
    return jsonError("Не удалось сгенерировать QR", 500);
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    payload,
    code: payload.code,
    displayCode: formatCodeDisplay(payload.code),
    slot: payload.slot,
    expiresInMs: Math.max(0, 30 * 60 * 1000 - (Date.now() % (30 * 60 * 1000))),
  });
}
