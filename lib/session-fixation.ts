/**
 * Session fixation — offline-first training verification.
 * "Лучшая борьба — борьба с самим собой"
 *
 * Flow:
 *   1. Fighter creates session key locally (before training)
 *   2. Gym confirmation: offline QR · Bluetooth · manual code
 *   3. On reconnect: validate time / trainerId / key → sync to Supabase
 *
 * Only system-verified sessions count for XP, ELO, and history.
 */

import { saveData, loadData, STORAGE_KEYS } from "@/lib/storage";
import {
  generateTrainerCode,
  getCodeSlot,
  verifyTrainerCode,
  CODE_ROTATION_MS,
  type VerifyMethod,
} from "@/lib/verify";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Time window to confirm at the gym after creating a session key. */
export const SESSION_CONFIRM_TTL_MS = 4 * 60 * 60 * 1000;

/** Grace period to sync a confirmed session after going back online. */
export const SESSION_SYNC_GRACE_MS = 24 * 60 * 60 * 1000;

/** Max clock skew allowed between device and confirmation timestamp. */
export const MAX_CLOCK_SKEW_MS = 15 * 60 * 1000;

const QR_PROTOCOL = "wp-fix-v1";
const SIG_SALT = "round23-offline-fixation";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FixationMethod = "qr_offline" | "bluetooth" | "manual_code";

export type FixationStatus =
  | "pending"
  | "confirmed"
  | "synced"
  | "rejected"
  | "expired";

export type FixationSession = {
  sessionKey: string;
  fighterId: string;
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  createdAt: string;
  expiresAt: string;
  status: FixationStatus;
  confirmMethod?: FixationMethod;
  verifyMethod?: VerifyMethod;
  confirmedAt?: string;
  confirmProof?: string;
  syncedAt?: string;
  rejectionReason?: string;
  /** Estimated gross for economy sync (from booking or default). */
  grossRub: number;
};

export type TrainerQrPayload = {
  v: 1;
  p: typeof QR_PROTOCOL | "wp-fix-v2";
  tid: string;
  gid: string;
  slot: number;
  code: string;
  ts: number;
  sig: string;
};

export type ConfirmResult =
  | { ok: true; session: FixationSession }
  | { ok: false; reason: string };

export type SyncValidation = {
  valid: boolean;
  errors: string[];
};

// ── Anti-bypass messaging ─────────────────────────────────────────────────────

export const SYSTEM_VALUE = {
  headline: "Только через систему",
  subline:
    "XP · ELO · рейтинг · история — засчитываются только при фиксации в Round 23.",
  warning:
    "Тренировка вне системы = ноль XP, ноль в рейтинге, нет в Warrior Passport.",
  cta: "Зафиксируй до начала — иначе прогресс не сохранится.",
} as const;

export function countsForProgress(session: FixationSession | null | undefined): boolean {
  return session?.status === "confirmed" || session?.status === "synced";
}

export function isUnverifiedTraining(): boolean {
  return !getActivePendingSession() && getAwaitingSyncSessions().length === 0;
}

// ── Storage ───────────────────────────────────────────────────────────────────

function loadSessions(): FixationSession[] {
  return loadData<FixationSession[]>(STORAGE_KEYS.fixationSessions, []);
}

function saveSessions(sessions: FixationSession[]): void {
  saveData(STORAGE_KEYS.fixationSessions, sessions);
}

function upsertSession(session: FixationSession): void {
  const all = loadSessions();
  const idx = all.findIndex((s) => s.sessionKey === session.sessionKey);
  if (idx >= 0) all[idx] = session;
  else all.unshift(session);
  saveSessions(all.slice(0, 100));
}

// ── Session key ───────────────────────────────────────────────────────────────

function hashSig(input: string): string {
  let h = 2_166_136_261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return Math.abs(h).toString(36);
}

export function generateSessionKey(
  fighterId: string,
  trainerId: string,
  now = Date.now(),
): string {
  const raw = `${fighterId}:${trainerId}:${now}:${Math.random().toString(36).slice(2, 8)}`;
  return hashSig(raw).slice(0, 10).toUpperCase();
}

export type CreateSessionInput = {
  fighterId: string;
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  grossRub?: number;
};

/** Step 1 — create session key locally before training. */
export function createPendingSession(
  input: CreateSessionInput,
  now = Date.now(),
): FixationSession {
  const expiresAt = new Date(now + SESSION_CONFIRM_TTL_MS).toISOString();

  const session: FixationSession = {
    sessionKey: generateSessionKey(input.fighterId, input.trainerId, now),
    fighterId: input.fighterId,
    trainerId: input.trainerId,
    trainerName: input.trainerName,
    gymId: input.gymId,
    gymName: input.gymName,
    createdAt: new Date(now).toISOString(),
    expiresAt,
    status: "pending",
    grossRub: input.grossRub ?? 2_000,
  };

  upsertSession(session);
  return session;
}

export function getSessionByKey(sessionKey: string): FixationSession | null {
  return loadSessions().find((s) => s.sessionKey === sessionKey) ?? null;
}

export function getActivePendingSession(
  fighterId?: string,
  now = Date.now(),
): FixationSession | null {
  const sessions = loadSessions();
  for (const s of sessions) {
    if (s.status !== "pending") continue;
    if (fighterId && s.fighterId !== fighterId) continue;
    if (new Date(s.expiresAt).getTime() < now) {
      upsertSession({ ...s, status: "expired", rejectionReason: "Время подтверждения истекло" });
      continue;
    }
    return s;
  }
  return null;
}

export function getAwaitingSyncSessions(): FixationSession[] {
  return loadSessions().filter((s) => s.status === "confirmed");
}

export function getVerifiedHistory(limit = 20): FixationSession[] {
  return loadSessions()
    .filter((s) => s.status === "synced")
    .slice(0, limit);
}

// ── Trainer offline QR ────────────────────────────────────────────────────────

function buildSig(tid: string, gid: string, slot: number, code: string, ts: number): string {
  return hashSig(`${SIG_SALT}:${tid}:${gid}:${slot}:${code}:${ts}`).slice(0, 8);
}

/** Trainer-side payload — works without internet. */
export function buildTrainerOfflineQr(
  trainerId: string,
  gymId: string,
  now = Date.now(),
): TrainerQrPayload {
  const slot = getCodeSlot(now);
  const code = generateTrainerCode(trainerId, now);
  const ts = now;
  return {
    v: 1,
    p: QR_PROTOCOL,
    tid: trainerId,
    gid: gymId,
    slot,
    code,
    ts,
    sig: buildSig(trainerId, gymId, slot, code, ts),
  };
}

export function encodeTrainerQr(payload: TrainerQrPayload): string {
  const json = JSON.stringify(payload);
  if (typeof btoa !== "undefined") {
    return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeTrainerQr(raw: string): TrainerQrPayload | null {
  try {
    const normalized = raw.trim().replace(/^wp:\/\//, "");
    const b64 = normalized.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json =
      typeof atob !== "undefined"
        ? atob(b64 + pad)
        : Buffer.from(b64 + pad, "base64").toString("utf8");
    const parsed = JSON.parse(json) as TrainerQrPayload;
    if (parsed?.v !== 1) return null;
    if (parsed?.p !== QR_PROTOCOL && parsed?.p !== "wp-fix-v2") return null;
    return parsed;
  } catch {
    return null;
  }
}

function verifyTrainerQrPayload(payload: TrainerQrPayload, now = Date.now()): boolean {
  if (payload.p === "wp-fix-v2") {
    // v2 payloads are HMAC-signed on the server — local bundle can't verify them.
    // Accept structure + freshness; full check happens at /api/fixation/sync.
    if (Math.abs(now - payload.ts) > CODE_ROTATION_MS * 2) return false;
    return payload.sig.length >= 8 && payload.code.length === 4;
  }

  const expectedSig = buildSig(payload.tid, payload.gid, payload.slot, payload.code, payload.ts);
  if (payload.sig !== expectedSig) return false;
  if (Math.abs(now - payload.ts) > CODE_ROTATION_MS * 2) return false;
  return verifyTrainerCode(payload.tid, payload.code);
}

// ── Gym confirmation ──────────────────────────────────────────────────────────

function confirmSession(
  sessionKey: string,
  method: FixationMethod,
  verifyMethod: VerifyMethod,
  proof: string,
  now = Date.now(),
): ConfirmResult {
  const session = getSessionByKey(sessionKey);
  if (!session) return { ok: false, reason: "Сессия не найдена. Создай ключ перед тренировкой." };
  if (session.status !== "pending") {
    return { ok: false, reason: "Сессия уже подтверждена или закрыта." };
  }
  if (new Date(session.expiresAt).getTime() < now) {
    upsertSession({ ...session, status: "expired", rejectionReason: "Время подтверждения истекло" });
    return { ok: false, reason: "Время подтверждения истекло. Создай новый ключ." };
  }

  const confirmed: FixationSession = {
    ...session,
    status: "confirmed",
    confirmMethod: method,
    verifyMethod,
    confirmedAt: new Date(now).toISOString(),
    confirmProof: proof,
  };
  upsertSession(confirmed);
  return { ok: true, session: confirmed };
}

/** Step 2a — scan trainer offline QR. */
export function confirmViaOfflineQr(
  sessionKey: string,
  qrRaw: string,
  now = Date.now(),
): ConfirmResult {
  const session = getSessionByKey(sessionKey);
  if (!session) return { ok: false, reason: "Сессия не найдена." };

  const payload = decodeTrainerQr(qrRaw);
  if (!payload) return { ok: false, reason: "Неверный QR-код." };
  if (payload.tid !== session.trainerId) {
    return { ok: false, reason: "QR другого тренера. Подтверди у своего тренера." };
  }
  if (!verifyTrainerQrPayload(payload, now)) {
    return { ok: false, reason: "QR устарел или подделан. Обнови код у тренера." };
  }

  return confirmSession(
    sessionKey,
    "qr_offline",
    "qr",
    payload.p === "wp-fix-v2"
      ? `qr2:${payload.tid}:${payload.gid}:${payload.slot}:${payload.code}:${payload.ts}:${payload.sig}`
      : `qr:${payload.tid}:${payload.gid}:${payload.slot}:${payload.code}:${payload.ts}:${payload.sig}`,
    now,
  );
}

/**
 * Step 2b — manual 4-digit code (fallback).
 * `opts.serverVerified` — код уже проверен сервером (/api/checkin/verify),
 * локальная demo-проверка пропускается.
 */
export function confirmViaManualCode(
  sessionKey: string,
  code: string,
  now = Date.now(),
  opts: { serverVerified?: boolean } = {},
): ConfirmResult {
  const session = getSessionByKey(sessionKey);
  if (!session) return { ok: false, reason: "Сессия не найдена." };

  const normalized = code.replace(/\D/g, "").slice(0, 4);
  if (normalized.length !== 4) {
    return { ok: false, reason: "Введи 4 цифры с экрана тренера." };
  }
  if (!opts.serverVerified && !verifyTrainerCode(session.trainerId, normalized)) {
    return { ok: false, reason: "Неверный код. Проверь экран тренера." };
  }

  return confirmSession(
    sessionKey,
    "manual_code",
    "code",
    `code:${session.trainerId}:${getCodeSlot(now)}:${normalized}`,
    now,
  );
}

/** Step 2c — Bluetooth proximity (when available). */
export function confirmViaBluetooth(
  sessionKey: string,
  beaconTrainerId: string,
  beaconProof: string,
  now = Date.now(),
): ConfirmResult {
  const session = getSessionByKey(sessionKey);
  if (!session) return { ok: false, reason: "Сессия не найдена." };
  if (beaconTrainerId !== session.trainerId) {
    return { ok: false, reason: "Bluetooth-маяк другого тренера." };
  }

  return confirmSession(
    sessionKey,
    "bluetooth",
    "mutual",
    `bt:${beaconTrainerId}:${beaconProof}`,
    now,
  );
}

// ── Sync validation (anti-bypass) ─────────────────────────────────────────────

export function validateFixationForSync(
  session: FixationSession,
  now = Date.now(),
): SyncValidation {
  const errors: string[] = [];

  if (session.status !== "confirmed") {
    errors.push("Сессия не подтверждена в зале.");
  }
  if (!session.confirmMethod || !session.confirmedAt || !session.confirmProof) {
    errors.push("Нет доказательства фиксации.");
  }
  if (!session.sessionKey || session.sessionKey.length < 6) {
    errors.push("Невалидный session key.");
  }

  const createdMs = new Date(session.createdAt).getTime();
  const confirmedMs = session.confirmedAt
    ? new Date(session.confirmedAt).getTime()
    : NaN;

  if (!Number.isFinite(createdMs)) errors.push("Невалидное время создания.");
  if (!Number.isFinite(confirmedMs)) errors.push("Невалидное время подтверждения.");

  if (Number.isFinite(confirmedMs) && Number.isFinite(createdMs)) {
    if (confirmedMs < createdMs - MAX_CLOCK_SKEW_MS) {
      errors.push("Подтверждение раньше создания ключа.");
    }
    if (confirmedMs > createdMs + SESSION_CONFIRM_TTL_MS + MAX_CLOCK_SKEW_MS) {
      errors.push("Подтверждение слишком поздно.");
    }
  }

  if (session.confirmedAt && now - new Date(session.confirmedAt).getTime() > SESSION_SYNC_GRACE_MS) {
    errors.push("Срок синхронизации истёк.");
  }

  if (!session.trainerId) errors.push("trainerId отсутствует.");

  return { valid: errors.length === 0, errors };
}

export function markSessionSynced(sessionKey: string): void {
  const session = getSessionByKey(sessionKey);
  if (!session) return;
  upsertSession({
    ...session,
    status: "synced",
    syncedAt: new Date().toISOString(),
  });
}

export function markSessionRejected(sessionKey: string, reason: string): void {
  const session = getSessionByKey(sessionKey);
  if (!session) return;
  upsertSession({
    ...session,
    status: "rejected",
    rejectionReason: reason,
  });
}

export function formatSessionKey(key: string): string {
  if (key.length <= 5) return key;
  return `${key.slice(0, 5)}·${key.slice(5)}`;
}
