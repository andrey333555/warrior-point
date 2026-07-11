import { createHmac, timingSafeEqual } from "node:crypto";
import { CODE_ROTATION_MS, getCodeSlot, getCodeTimeLeftMs } from "@/lib/verify";

export type ServerTrainerQrPayload = {
  v: 1;
  p: "wp-fix-v2";
  tid: string;
  gid: string;
  slot: number;
  code: string;
  ts: number;
  sig: string;
};

/**
 * Server-secret trainer check-in codes.
 *
 * The legacy client code (`generateTrainerCode`) is a public deterministic
 * hash — anyone reading the bundle can compute it and self-verify a
 * training. With CHECKIN_SECRET set, codes are derived from an HMAC that
 * only the server knows: trainers fetch their code from /api/checkin/code,
 * fighters verify through /api/checkin/verify.
 */

function checkinSecret(): string | null {
  const secret =
    process.env.CHECKIN_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  return secret || null;
}

export function isCheckinSecretConfigured(): boolean {
  return checkinSecret() !== null;
}

function qrSig(
  tid: string,
  gid: string,
  slot: number,
  code: string,
  ts: number,
): string | null {
  const secret = checkinSecret();
  if (!secret) return null;

  return createHmac("sha256", secret)
    .update(`wp-qr:${tid}:${gid}:${slot}:${code}:${ts}`)
    .digest("hex")
    .slice(0, 12);
}

export function serverTrainerCode(
  trainerId: string,
  now = Date.now(),
): string | null {
  const secret = checkinSecret();
  if (!secret) return null;

  const slot = getCodeSlot(now);
  const digest = createHmac("sha256", secret)
    .update(`wp-checkin:${trainerId}:${slot}`)
    .digest();

  return (digest.readUInt32BE(0) % 10_000).toString().padStart(4, "0");
}

/** Accepts the current and the previous 30-min slot (clock drift grace). */
export function verifyServerTrainerCode(
  trainerId: string,
  inputCode: string,
  now = Date.now(),
): boolean {
  const normalized = inputCode.replace(/\D/g, "").slice(0, 4);
  if (normalized.length !== 4) return false;

  const current = serverTrainerCode(trainerId, now);
  const previous = serverTrainerCode(trainerId, now - CODE_ROTATION_MS);
  if (!current) return false;

  return normalized === current || normalized === previous;
}

export function serverCodeExpiry(now = Date.now()): {
  slot: number;
  expiresInMs: number;
} {
  return { slot: getCodeSlot(now), expiresInMs: getCodeTimeLeftMs(now) };
}

/** Server-signed offline QR payload for trainer display. */
export function buildServerTrainerOfflineQr(
  trainerId: string,
  gymId: string,
  now = Date.now(),
): ServerTrainerQrPayload | null {
  const code = serverTrainerCode(trainerId, now);
  if (!code) return null;

  const slot = getCodeSlot(now);
  const ts = now;
  const sig = qrSig(trainerId, gymId, slot, code, ts);
  if (!sig) return null;

  return {
    v: 1,
    p: "wp-fix-v2",
    tid: trainerId,
    gid: gymId,
    slot,
    code,
    ts,
    sig,
  };
}

export function verifyServerTrainerQrPayload(
  payload: ServerTrainerQrPayload,
  now = Date.now(),
): boolean {
  if (payload?.v !== 1 || payload?.p !== "wp-fix-v2") return false;

  const expected = qrSig(
    payload.tid,
    payload.gid,
    payload.slot,
    payload.code,
    payload.ts,
  );
  if (!expected) return false;

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(payload.sig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  if (Math.abs(now - payload.ts) > CODE_ROTATION_MS * 2) return false;

  return verifyServerTrainerCode(payload.tid, payload.code, now);
}
