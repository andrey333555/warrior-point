import { NextResponse } from "next/server";
import {
  isCheckinSecretConfigured,
  serverCodeExpiry,
  serverTrainerCode,
} from "@/lib/checkin-server";
import { formatCodeDisplay } from "@/lib/verify";

export const runtime = "nodejs";

/**
 * Trainer's rotating check-in code (server secret).
 * Called by the trainer's own device to display the code — fighters can't
 * compute it from the bundle like the legacy client-side hash.
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

  if (!isCheckinSecretConfigured()) {
    // No secret yet — client falls back to the local demo code.
    return NextResponse.json({ ok: true, configured: false });
  }

  const code = serverTrainerCode(trainerId);
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
