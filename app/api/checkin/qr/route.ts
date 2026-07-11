import { NextResponse } from "next/server";
import {
  buildServerTrainerOfflineQr,
  isCheckinSecretConfigured,
} from "@/lib/checkin-server";
import { formatCodeDisplay } from "@/lib/verify";

export const runtime = "nodejs";

/**
 * Server-signed offline QR payload for trainer display.
 * Fighters cannot forge v2 QR without CHECKIN_SECRET.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainerId = searchParams.get("trainerId")?.trim() ?? "";
  const gymId = searchParams.get("gymId")?.trim() ?? "gym";

  if (!trainerId || trainerId.length > 64) {
    return NextResponse.json(
      { ok: false, message: "trainerId обязателен" },
      { status: 400 },
    );
  }

  if (!isCheckinSecretConfigured()) {
    return NextResponse.json({ ok: true, configured: false });
  }

  const payload = buildServerTrainerOfflineQr(trainerId, gymId);
  if (!payload) {
    return NextResponse.json(
      { ok: false, message: "Не удалось сгенерировать QR" },
      { status: 500 },
    );
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
