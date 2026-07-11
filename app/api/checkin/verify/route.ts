import { NextResponse } from "next/server";
import {
  isCheckinSecretConfigured,
  verifyServerTrainerCode,
} from "@/lib/checkin-server";

export const runtime = "nodejs";

type VerifyBody = {
  trainerId?: string;
  code?: string;
};

/** Server-side check of a fighter-entered trainer code. */
export async function POST(req: Request) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const trainerId = typeof body.trainerId === "string" ? body.trainerId.trim() : "";
  const code = typeof body.code === "string" ? body.code : "";

  if (!trainerId || trainerId.length > 64 || !code) {
    return NextResponse.json(
      { ok: false, message: "trainerId и code обязательны" },
      { status: 400 },
    );
  }

  if (!isCheckinSecretConfigured()) {
    return NextResponse.json({ ok: true, configured: false, valid: false });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    valid: verifyServerTrainerCode(trainerId, code),
  });
}
