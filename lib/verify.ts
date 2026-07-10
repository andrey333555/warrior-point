import { ACTIVE_GYMS } from "@/lib/gyms";
import { findTrainer, getGymName } from "@/lib/network";

// Система подтверждения тренировки — 5 способов
// Приоритет: Гео (авто) → Код → QR → Взаимное → Ручное

export type VerifyMethod = "geo" | "qr" | "code" | "mutual" | "manual";

export type VerifyResult = {
  verified: boolean;
  method: VerifyMethod;
  confidence: "high" | "medium" | "low";
  timestamp: string;
  details: string;
};

export type GymLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
};

export type GeoPoint = {
  lat: number;
  lng: number;
};

// ═══════════════════════════════════════════════════════════════
// 1. ГЕОЛОКАЦИЯ
// ═══════════════════════════════════════════════════════════════

export function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInGymZone(
  userLat: number,
  userLng: number,
  gym: GymLocation,
): { inZone: boolean; distance: number } {
  const distance = getDistance(userLat, userLng, gym.lat, gym.lng);
  return {
    inZone: distance <= gym.radiusMeters,
    distance: Math.round(distance),
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. КОД ТРЕНЕРА — 4 цифры, меняется каждые 30 минут
// ═══════════════════════════════════════════════════════════════

export const CODE_ROTATION_MS = 30 * 60 * 1000;

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export function getCodeSlot(now = Date.now()): number {
  return Math.floor(now / CODE_ROTATION_MS);
}

export function getCodeTimeLeftMs(now = Date.now()): number {
  return CODE_ROTATION_MS - (now % CODE_ROTATION_MS);
}

export function generateTrainerCode(trainerId: string, now = Date.now()): string {
  const slot = getCodeSlot(now);
  const seed = hashCode(`${trainerId}-${slot}`);
  return Math.abs(seed % 10_000)
    .toString()
    .padStart(4, "0");
}

export function verifyTrainerCode(trainerId: string, inputCode: string): boolean {
  const normalized = inputCode.replace(/\D/g, "").slice(0, 4);
  if (normalized.length !== 4) return false;

  const now = Date.now();
  const currentCode = generateTrainerCode(trainerId, now);
  const prevCode = generateTrainerCode(
    trainerId,
    now - CODE_ROTATION_MS,
  );

  return normalized === currentCode || normalized === prevCode;
}

export function formatCodeDisplay(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length === 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return code;
}

export type TrainerCodeSession = {
  code: string;
  displayCode: string;
  slot: number;
  expiresInMs: number;
  expiresAt: number;
};

export function createTrainerCodeSession(
  trainerId: string,
  now = Date.now(),
): TrainerCodeSession {
  const slot = getCodeSlot(now);
  const code = generateTrainerCode(trainerId, now);
  const expiresInMs = getCodeTimeLeftMs(now);

  return {
    code,
    displayCode: formatCodeDisplay(code),
    slot,
    expiresInMs,
    expiresAt: now + expiresInMs,
  };
}

// ═══════════════════════════════════════════════════════════════
// 3. ВЗАИМНОЕ ПОДТВЕРЖДЕНИЕ
// ═══════════════════════════════════════════════════════════════

export type MutualConfirm = {
  sessionId: string;
  clientConfirmed: boolean;
  trainerConfirmed: boolean;
  clientTime?: string;
  trainerTime?: string;
};

export function isMutuallyConfirmed(confirm: MutualConfirm): boolean {
  if (!confirm.clientConfirmed || !confirm.trainerConfirmed) return false;
  if (!confirm.clientTime || !confirm.trainerTime) return false;

  const diff = Math.abs(
    new Date(confirm.clientTime).getTime() -
      new Date(confirm.trainerTime).getTime(),
  );
  return diff <= CODE_ROTATION_MS;
}

// ═══════════════════════════════════════════════════════════════
// 4. УМНЫЙ ВЫБОР МЕТОДА
// ═══════════════════════════════════════════════════════════════

export type VerifyContext = {
  hasGPS: boolean;
  userLat?: number;
  userLng?: number;
  gym?: GymLocation;
  trainerId?: string;
  inputCode?: string;
  qrScanned?: boolean;
  mutualConfirm?: MutualConfirm;
};

export function smartVerify(ctx: VerifyContext): VerifyResult {
  const timestamp = new Date().toISOString();

  if (ctx.hasGPS && ctx.userLat != null && ctx.userLng != null && ctx.gym) {
    const { inZone, distance } = isInGymZone(
      ctx.userLat,
      ctx.userLng,
      ctx.gym,
    );
    if (inZone) {
      return {
        verified: true,
        method: "geo",
        confidence: "high",
        timestamp,
        details: `📍 Автоматически подтверждено. Ты в ${ctx.gym.name} (${distance}м)`,
      };
    }
  }

  if (ctx.qrScanned) {
    return {
      verified: true,
      method: "qr",
      confidence: "high",
      timestamp,
      details: "📱 Подтверждено через QR-код тренера",
    };
  }

  if (ctx.trainerId && ctx.inputCode) {
    const valid = verifyTrainerCode(ctx.trainerId, ctx.inputCode);
    return {
      verified: valid,
      method: "code",
      confidence: valid ? "high" : "low",
      timestamp,
      details: valid
        ? "🔢 Подтверждено кодом тренера"
        : "❌ Неверный код",
    };
  }

  if (ctx.mutualConfirm) {
    const confirmed = isMutuallyConfirmed(ctx.mutualConfirm);
    return {
      verified: confirmed,
      method: "mutual",
      confidence: confirmed ? "medium" : "low",
      timestamp,
      details: confirmed
        ? "🤝 Подтверждено обоими участниками"
        : "⏳ Ожидаем подтверждение второго участника",
    };
  }

  return {
    verified: false,
    method: "manual",
    confidence: "low",
    timestamp,
    details: "Выберите способ подтверждения",
  };
}

// ═══════════════════════════════════════════════════════════════
// Залы (mock)
// ═══════════════════════════════════════════════════════════════

export const KRASNODAR_GYMS: GymLocation[] = [
  { id: "1", name: "Кузня · Главный", lat: 45.0355, lng: 38.9753, radiusMeters: 100 },
  { id: "2", name: "Кузня · Юбилейный", lat: 45.029, lng: 38.968, radiusMeters: 80 },
  { id: "3", name: "Tiger Gym", lat: 45.041, lng: 38.982, radiusMeters: 70 },
  { id: "4", name: "Fight Lab", lat: 45.018, lng: 38.959, radiusMeters: 90 },
  { id: "5", name: "Akhmat Fight Club", lat: 45.05, lng: 38.99, radiusMeters: 120 },
];

// ═══════════════════════════════════════════════════════════════
// SmartCheckIn — совместимость
// ═══════════════════════════════════════════════════════════════

export const CHECK_IN_RADIUS_M = KRASNODAR_GYMS[0].radiusMeters;

export type CheckInStatus =
  | "idle"
  | "locating"
  | "near_gym"
  | "far_from_gym"
  | "geo_denied"
  | "geo_unavailable"
  | "verified"
  | "code_invalid"
  | "code_expired";

export type CheckInResult = {
  ok: boolean;
  status: CheckInStatus;
  distanceM?: number;
  message: string;
  verify?: VerifyResult;
};

export type CheckInVerifiedResult = {
  trainerId: number;
  trainerName: string;
  gymId: string;
  gymName: string;
  distanceM: number;
  verifiedAt: string;
  bookingId: string;
  xpAwarded: number;
  streakDays: number;
  totalXp: number;
  method: VerifyMethod;
  confidence: VerifyResult["confidence"];
  details: string;
};

export type TrainerCheckInSite = {
  trainerId: string;
  trainerIdNum: number;
  trainerName: string;
  gymId: string;
  gymName: string;
  lat: number;
  lng: number;
  radiusMeters: number;
};

const DEFAULT_CHECKIN_GYM_ID = "kuznya-krd-main";

export function resolveTrainerCheckInSite(
  trainerId: string | number,
): TrainerCheckInSite {
  const trainer = findTrainer(trainerId);
  const trainerIdNum = trainer?.id ?? (Number(trainerId) || 1);
  const trainerName = trainer?.name ?? "Тренер";
  const networkGymId = trainer?.gyms?.[0] ?? 1;
  const networkGymName = getGymName(networkGymId);

  const mapGym =
    ACTIVE_GYMS.find((g) => g.id === DEFAULT_CHECKIN_GYM_ID) ??
    ACTIVE_GYMS[0];

  const krasnodarGym =
    KRASNODAR_GYMS.find((g) => g.name.includes("Кузня")) ?? KRASNODAR_GYMS[0];

  return {
    trainerId: String(trainerIdNum),
    trainerIdNum,
    trainerName,
    gymId: mapGym?.id ?? krasnodarGym.id,
    gymName: networkGymName || mapGym?.name || krasnodarGym.name,
    lat: mapGym?.lat ?? krasnodarGym.lat,
    lng: mapGym?.lng ?? krasnodarGym.lng,
    radiusMeters: krasnodarGym.radiusMeters,
  };
}

export function siteToGymLocation(site: TrainerCheckInSite): GymLocation {
  return {
    id: site.gymId,
    name: site.gymName,
    lat: site.lat,
    lng: site.lng,
    radiusMeters: site.radiusMeters,
  };
}

export function distanceToGymM(user: GeoPoint, gym: GeoPoint): number {
  return Math.round(getDistance(user.lat, user.lng, gym.lat, gym.lng));
}

export function checkGeoAtGym(
  user: GeoPoint,
  gym: GymLocation | GeoPoint & { radiusMeters?: number },
  radiusM = CHECK_IN_RADIUS_M,
): CheckInResult {
  const gymLocation: GymLocation =
    "radiusMeters" in gym && gym.radiusMeters != null
      ? (gym as GymLocation)
      : {
          id: "temp",
          name: "Зал",
          lat: gym.lat,
          lng: gym.lng,
          radiusMeters: radiusM,
        };

  const { inZone, distance } = isInGymZone(
    user.lat,
    user.lng,
    gymLocation,
  );

  const verify = smartVerify({
    hasGPS: true,
    userLat: user.lat,
    userLng: user.lng,
    gym: gymLocation,
  });

  if (inZone) {
    return {
      ok: true,
      status: "near_gym",
      distanceM: distance,
      message: verify.details,
      verify,
    };
  }

  return {
    ok: false,
    status: "far_from_gym",
    distanceM: distance,
    message: `До зала ${distance} м · нужно ≤ ${gymLocation.radiusMeters} м`,
    verify,
  };
}

export function normalizeCheckInCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 4);
}

export function verifyClientCode(
  input: string,
  trainerId: string,
): CheckInResult {
  const normalized = normalizeCheckInCode(input);

  if (normalized.length !== 4) {
    return {
      ok: false,
      status: "code_invalid",
      message: "Введи 4 цифры с экрана тренера",
    };
  }

  const verify = smartVerify({
    hasGPS: false,
    trainerId,
    inputCode: normalized,
  });

  return {
    ok: verify.verified,
    status: verify.verified ? "verified" : "code_invalid",
    message: verify.details,
    verify,
  };
}

export function canCheckIn(
  geo: CheckInResult | null,
  code: CheckInResult | null,
): boolean {
  return (
    !!geo?.ok ||
    (!!code?.ok && code.status === "verified")
  );
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
