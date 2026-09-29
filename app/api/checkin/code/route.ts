import { NextResponse } from "next/server";
import {
  isCheckinSecretConfigured,
  serverCodeExpiry,
  serverTrainerCode,
} from "@/lib/checkin-server";
import { formatCodeDisplay } from "@/lib/verify";
import { requireBoundUserId, isLiveEconomyLocked } from "@/lib/api-session";
import { hashedClientKey, jsonError } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = rateLimit({
    key: `checkin-code:${hashedClientKey(req)}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) return jsonError("Слишком много запросов", 429);

  const { searchParams } = new URL(req.url);
  const trainerId = searchParams.get("trainerId")?.trim() ?? "";

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

  const code = serverTrainerCode(bound.userId);
  const { slot, expiresInMs } = serverCodeExpiry();

  return NextResponse.json({
    ok: true,
    configured: true,
    code,
    displayCode: code ? formatCodeDisplay(code) : null,
    slot,
    expiresInMs,
  });
}
