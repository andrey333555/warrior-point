import { NextResponse } from "next/server";
import {
  isCheckinSecretConfigured,
  serverCodeExpiry,
  serverTrainerCode,
} from "@/lib/checkin-server";
import { formatCodeDisplay } from "@/lib/verify";
import { requireBoundUserId } from "@/lib/api-session";

export const runtime = "nodejs";

/**
 * Trainer's rotating check-in code (server secret).
 * Only the bound trainer may fetch their code (session or demo gate).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trainerId = searchParams.get("trainerId")?.trim() ?? "";

  if (!trainerId || trainerId.length > 64) {
    return NextResponse.json(
      { ok: false, message: "trainerId обязателен" },
      { status: 400 },
    );
  }

  const bound = await requireBoundUserId(trainerId);
  if (!bound.ok) {
    return NextResponse.json(
      { ok: false, message: bound.message },
      { status: bound.status },
    );
  }

  if (!isCheckinSecretConfigured()) {
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
