import { NextResponse } from "next/server";
import {
  isCheckinSecretConfigured,
  verifyServerTrainerCode,
} from "@/lib/checkin-server";
import { hashedClientKey, jsonError, readJsonBody } from "@/lib/api-request";
import { rateLimit } from "@/lib/rate-limit";
import { isLiveEconomyLocked } from "@/lib/api-session";

export const runtime = "nodejs";

type VerifyBody = {
  trainerId?: string;
  code?: string;
};

export async function POST(req: Request) {
  const parsed = await readJsonBody<VerifyBody>(req);
  if (!parsed.ok) return jsonError(parsed.message, parsed.status);

  const trainerId =
    typeof parsed.body.trainerId === "string" ? parsed.body.trainerId.trim() : "";
  const code = typeof parsed.body.code === "string" ? parsed.body.code : "";

  if (!trainerId || trainerId.length > 64 || !code) {
    return jsonError("trainerId и code обязательны", 400);
  }

  const limited = rateLimit({
    key: `checkin-verify:${hashedClientKey(req, trainerId)}`,
    limit: 8,
    windowMs: 10 * 60_000,
  });
  if (!limited.ok) {
    return jsonError("Слишком много попыток. Подожди и введи код с экрана тренера.", 429);
  }

  if (!isCheckinSecretConfigured()) {
    if (isLiveEconomyLocked()) {
      return jsonError("Check-in не настроен (нужен CHECKIN_SECRET)", 503);
    }
    return NextResponse.json({ ok: true, configured: false, valid: false });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    valid: verifyServerTrainerCode(trainerId, code),
  });
}
