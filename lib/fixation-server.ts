import {
  isCheckinSecretConfigured,
  verifyServerTrainerCode,
  verifyServerTrainerQrPayload,
  type ServerTrainerQrPayload,
} from "@/lib/checkin-server";
import {
  SESSION_CONFIRM_TTL_MS,
  SESSION_SYNC_GRACE_MS,
  MAX_CLOCK_SKEW_MS,
  type FixationMethod,
  type FixationSession,
} from "@/lib/session-fixation";
import { verifyTrainerCode } from "@/lib/verify";

export type ServerFixationInput = {
  sessionKey: string;
  fighterId: string;
  trainerId: string;
  createdAt: string;
  confirmedAt: string;
  confirmMethod: FixationMethod;
  confirmProof: string;
  grossRub: number;
};

function parseCodeProof(proof: string): { trainerId: string; code: string } | null {
  const parts = proof.split(":");
  if (parts[0] !== "code" || parts.length < 4) return null;
  return { trainerId: parts[1], code: parts[3] };
}

function verifyCodeProof(trainerId: string, code: string, now: number): boolean {
  if (isCheckinSecretConfigured()) {
    return verifyServerTrainerCode(trainerId, code, now);
  }
  return verifyTrainerCode(trainerId, code);
}

function parseQrProof(
  proof: string,
): { version: 1 | 2; trainerId: string; gid?: string; slot: number; code?: string; ts?: number; sig: string } | null {
  const parts = proof.split(":");
  if (parts[0] === "qr2" && parts.length >= 7) {
    return {
      version: 2,
      trainerId: parts[1],
      gid: parts[2],
      slot: Number(parts[3]),
      code: parts[4],
      ts: Number(parts[5]),
      sig: parts[6],
    };
  }
  if (parts[0] === "qr" && parts.length >= 7) {
    return {
      version: 1,
      trainerId: parts[1],
      gid: parts[2],
      slot: Number(parts[3]),
      code: parts[4],
      ts: Number(parts[5]),
      sig: parts[6],
    };
  }
  if (parts[0] === "qr" && parts.length >= 4) {
    return {
      version: 1,
      trainerId: parts[1],
      slot: Number(parts[2]),
      sig: parts[3],
    };
  }
  return null;
}

function legacyQrSig(tid: string, gid: string, slot: number, code: string, ts: number): string {
  let h = 2_166_136_261;
  const raw = `round23-offline-fixation:${tid}:${gid}:${slot}:${code}:${ts}`;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return Math.abs(h).toString(36).slice(0, 8);
}

function verifyQrProof(
  proof: string,
  sessionTrainerId: string,
  confirmedMs: number,
): boolean {
  const parsed = parseQrProof(proof);
  if (!parsed || parsed.trainerId !== sessionTrainerId) return false;

  if (parsed.version === 2 && parsed.gid && parsed.code && parsed.ts) {
    if (!isCheckinSecretConfigured()) return false;
    return verifyServerTrainerQrPayload(
      {
        v: 1,
        p: "wp-fix-v2",
        tid: parsed.trainerId,
        gid: parsed.gid,
        slot: parsed.slot,
        code: parsed.code,
        ts: parsed.ts,
        sig: parsed.sig,
      },
      confirmedMs,
    );
  }

  if (isCheckinSecretConfigured()) return false;

  if (parsed.gid && parsed.code && parsed.ts) {
    const expected = legacyQrSig(
      parsed.trainerId,
      parsed.gid,
      parsed.slot,
      parsed.code,
      parsed.ts,
    );
    return parsed.sig === expected && verifyTrainerCode(parsed.trainerId, parsed.code);
  }

  return parsed.sig.length >= 4;
}

/** Re-verify fixation proof on the server before persisting XP. */
export function validateServerFixation(
  input: ServerFixationInput,
  now = Date.now(),
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.sessionKey || input.sessionKey.length < 6) {
    errors.push("Невалидный session key.");
  }
  if (!input.fighterId || !input.trainerId) {
    errors.push("fighterId / trainerId обязательны.");
  }
  if (!input.confirmMethod || !input.confirmProof) {
    errors.push("Нет доказательства фиксации.");
  }

  const createdMs = Date.parse(input.createdAt);
  const confirmedMs = Date.parse(input.confirmedAt);
  if (!Number.isFinite(createdMs)) errors.push("Невалидное время создания.");
  if (!Number.isFinite(confirmedMs)) errors.push("Невалидное время подтверждения.");

  if (Number.isFinite(confirmedMs) && Number.isFinite(createdMs)) {
    if (confirmedMs < createdMs - MAX_CLOCK_SKEW_MS) {
      errors.push("Подтверждение раньше создания ключа.");
    }
    if (confirmedMs > createdMs + SESSION_CONFIRM_TTL_MS + MAX_CLOCK_SKEW_MS) {
      errors.push("Подтверждение слишком поздно.");
    }
    if (now - confirmedMs > SESSION_SYNC_GRACE_MS) {
      errors.push("Срок синхронизации истёк.");
    }
  }

  const gross = typeof input.grossRub === "number" ? input.grossRub : NaN;
  if (!Number.isFinite(gross) || gross <= 0 || gross > 100_000) {
    errors.push("Некорректная сумма тренировки.");
  }

  if (input.confirmMethod === "manual_code") {
    const parsed = parseCodeProof(input.confirmProof);
    if (!parsed || parsed.trainerId !== input.trainerId) {
      errors.push("Невалидный code proof.");
    } else if (!verifyCodeProof(parsed.trainerId, parsed.code, confirmedMs)) {
      errors.push("Код тренера не прошёл серверную проверку.");
    }
  } else if (input.confirmMethod === "qr_offline") {
    const parsed = parseQrProof(input.confirmProof);
    if (!parsed || parsed.trainerId !== input.trainerId) {
      errors.push("Невалидный QR proof.");
    } else if (!verifyQrProof(input.confirmProof, input.trainerId, confirmedMs)) {
      errors.push("QR не прошёл серверную проверку.");
    }
  } else if (input.confirmMethod === "bluetooth") {
    const parts = input.confirmProof.split(":");
    if (parts[0] !== "bt" || parts[1] !== input.trainerId) {
      errors.push("Невалидный Bluetooth proof.");
    }
  } else {
    errors.push("Неизвестный метод фиксации.");
  }

  return { valid: errors.length === 0, errors };
}

/** Accept a full client fixation session for server validation. */
export function validateServerFixationSession(
  session: FixationSession,
  now = Date.now(),
): { valid: boolean; errors: string[] } {
  if (session.status !== "confirmed") {
    return { valid: false, errors: ["Сессия не подтверждена в зале."] };
  }
  if (!session.confirmMethod || !session.confirmedAt || !session.confirmProof) {
    return { valid: false, errors: ["Нет доказательства фиксации."] };
  }

  return validateServerFixation(
    {
      sessionKey: session.sessionKey,
      fighterId: session.fighterId,
      trainerId: session.trainerId,
      createdAt: session.createdAt,
      confirmedAt: session.confirmedAt,
      confirmMethod: session.confirmMethod,
      confirmProof: session.confirmProof,
      grossRub: session.grossRub,
    },
    now,
  );
}

/** Verify a decoded v2 server QR payload. */
export function verifyServerFixationQr(
  payload: ServerTrainerQrPayload,
  trainerId: string,
  now = Date.now(),
): boolean {
  if (payload.tid !== trainerId) return false;
  return verifyServerTrainerQrPayload(payload, now);
}
