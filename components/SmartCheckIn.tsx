"use client";

import { useEffect, useRef, useState } from "react";
import { applyCheckInRewards } from "@/lib/check-in-rewards";
import {
  CODE_ROTATION_MS,
  generateTrainerCode,
  isInGymZone,
  KRASNODAR_GYMS,
  resolveTrainerCheckInSite,
  smartVerify,
  verifyTrainerCode,
  type GymLocation,
  type VerifyResult,
} from "@/lib/verify";

type SmartCheckInProps = {
  trainerId: string;
  onVerified: (result: VerifyResult) => void;
};

export default function SmartCheckIn({
  trainerId,
  onVerified,
}: SmartCheckInProps) {
  const [method, setMethod] = useState<"auto" | "code" | "qr" | "mutual">(
    "auto",
  );
  const [geoStatus, setGeoStatus] = useState<
    "checking" | "found" | "denied" | "far"
  >("checking");
  const [nearestGym, setNearestGym] = useState<GymLocation | null>(null);
  const [distance, setDistance] = useState(0);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [verified, setVerified] = useState<VerifyResult | null>(null);
  const [mutualSent, setMutualSent] = useState(false);

  const onVerifiedRef = useRef(onVerified);
  const rewardedRef = useRef(false);
  const site = useRef(resolveTrainerCheckInSite(trainerId));

  useEffect(() => {
    onVerifiedRef.current = onVerified;
    site.current = resolveTrainerCheckInSite(trainerId);
  }, [onVerified, trainerId]);

  const finalize = (result: VerifyResult, dist = distance) => {
    if (!result.verified || rewardedRef.current) return;
    rewardedRef.current = true;
    applyCheckInRewards(site.current, dist, result);
    setVerified(result);
    onVerifiedRef.current(result);
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let closest: GymLocation | null = null;
        let minDist = Infinity;

        for (const gym of KRASNODAR_GYMS) {
          const { inZone, distance: d } = isInGymZone(
            latitude,
            longitude,
            gym,
          );
          if (d < minDist) {
            minDist = d;
            closest = gym;
          }
          if (inZone) {
            setGeoStatus("found");
            setNearestGym(gym);
            setDistance(d);

            const result = smartVerify({
              hasGPS: true,
              userLat: latitude,
              userLng: longitude,
              gym,
            });
            finalize(result, d);
            return;
          }
        }

        setNearestGym(closest);
        setDistance(Math.round(minDist));
        setGeoStatus("far");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [trainerId]);

  const handleCodeSubmit = () => {
    const valid = verifyTrainerCode(trainerId, code);
    if (valid) {
      const result: VerifyResult = {
        verified: true,
        method: "code",
        confidence: "high",
        timestamp: new Date().toISOString(),
        details: "🔢 Подтверждено кодом тренера",
      };
      finalize(result);
    } else {
      setCodeError(true);
      setTimeout(() => setCodeError(false), 2000);
    }
  };

  const handleQrScan = () => {
    const result = smartVerify({ hasGPS: false, qrScanned: true });
    finalize(result);
  };

  const handleMutualConfirm = () => {
    setMutualSent(true);
    const now = new Date().toISOString();
    const result = smartVerify({
      hasGPS: false,
      mutualConfirm: {
        sessionId: `mutual-${trainerId}`,
        clientConfirmed: true,
        trainerConfirmed: true,
        clientTime: now,
        trainerTime: now,
      },
    });
    if (result.verified) {
      finalize(result);
    }
  };

  if (verified?.verified) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{
          background: "rgba(34,197,94,0.08)",
          border: "0.5px solid rgba(34,197,94,0.3)",
        }}
      >
        <div className="mb-3 text-4xl">✅</div>
        <p className="mb-1 text-lg font-semibold text-white">Ты в зале!</p>
        <p className="text-sm text-white/50">{verified.details}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-xs text-green-400">
            {verified.method === "geo"
              ? "Геолокация"
              : verified.method === "code"
                ? "Код тренера"
                : verified.method === "qr"
                  ? "QR-код"
                  : verified.method === "mutual"
                    ? "Взаимное"
                    : "Подтверждено"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="p-4 pb-3">
        <p className="mb-1 font-medium text-white">Подтверди тренировку</p>
        <p className="text-xs text-white/40">Выбери удобный способ</p>
      </div>

      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{
            background:
              geoStatus === "found"
                ? "rgba(34,197,94,0.08)"
                : geoStatus === "checking"
                  ? "rgba(201,168,76,0.06)"
                  : "rgba(255,255,255,0.03)",
            border:
              geoStatus === "found"
                ? "0.5px solid rgba(34,197,94,0.2)"
                : "0.5px solid rgba(255,255,255,0.06)",
          }}
        >
          {geoStatus === "checking" && (
            <>
              <div
                className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: "#C9A84C",
                  borderTopColor: "transparent",
                }}
              />
              <p className="text-sm text-white/60">Ищем ближайший зал...</p>
            </>
          )}
          {geoStatus === "found" && nearestGym && (
            <>
              <span className="text-lg">📍</span>
              <div>
                <p className="text-sm font-medium text-green-400">
                  Ты в {nearestGym.name}!
                </p>
                <p className="text-xs text-green-400/60">
                  {distance}м · Автоматически подтверждено
                </p>
              </div>
            </>
          )}
          {geoStatus === "far" && nearestGym && (
            <>
              <span className="text-lg">📍</span>
              <div>
                <p className="text-sm text-white/60">
                  Ближайший: {nearestGym.name}
                </p>
                <p className="text-xs text-white/40">
                  {distance}м — слишком далеко для авто
                </p>
              </div>
            </>
          )}
          {geoStatus === "denied" && (
            <>
              <span className="text-lg">🚫</span>
              <p className="text-sm text-white/40">
                GPS недоступен — используй другой способ
              </p>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex gap-2">
          {(
            [
              { id: "code" as const, icon: "🔢", label: "Код" },
              { id: "qr" as const, icon: "📱", label: "QR" },
              { id: "mutual" as const, icon: "🤝", label: "Оба" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 transition-all"
              style={
                method === m.id
                  ? {
                      background: "rgba(201,168,76,0.15)",
                      border: "0.5px solid rgba(201,168,76,0.4)",
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      border: "0.5px solid rgba(255,255,255,0.06)",
                    }
              }
            >
              <span className="text-lg">{m.icon}</span>
              <span
                className="text-xs"
                style={{
                  color:
                    method === m.id ? "#C9A84C" : "rgba(255,255,255,0.5)",
                }}
              >
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-2 pb-4">
        {method === "code" && (
          <div>
            <p className="mb-3 text-xs text-white/40">
              Попроси тренера назвать 4-значный код
            </p>
            <div className="mb-3 flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  inputMode="numeric"
                  value={code[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/, "");
                    const newCode = code.split("");
                    newCode[i] = val;
                    setCode(newCode.join(""));
                    if (val && i < 3) {
                      const parent = e.target.parentElement;
                      const next = parent?.children[i + 1] as
                        | HTMLInputElement
                        | undefined;
                      next?.focus();
                    }
                  }}
                  className="h-14 w-14 rounded-xl text-center text-xl font-bold text-white outline-none transition-all"
                  style={{
                    background: codeError
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(255,255,255,0.05)",
                    border: codeError
                      ? "1px solid rgba(239,68,68,0.5)"
                      : code[i]
                        ? "1px solid rgba(201,168,76,0.5)"
                        : "0.5px solid rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
            {codeError ? (
              <p className="mb-2 text-xs text-red-400">
                Неверный код. Попробуй ещё раз.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleCodeSubmit}
              disabled={code.length < 4}
              className="w-full rounded-xl py-3 text-sm font-medium transition-all"
              style={
                code.length >= 4
                  ? { background: "#C9A84C", color: "#0A0A0A" }
                  : {
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.2)",
                    }
              }
            >
              Подтвердить
            </button>
          </div>
        )}

        {method === "qr" && (
          <div className="py-4 text-center">
            <button
              type="button"
              onClick={handleQrScan}
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <svg
                width="32"
                height="32"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
                />
              </svg>
            </button>
            <p className="mb-1 text-sm text-white/60">
              Отсканируй QR-код тренера
            </p>
            <p className="text-xs text-white/30">
              Тренер показывает код на своём телефоне
            </p>
          </div>
        )}

        {method === "mutual" && (
          <div className="py-2 text-center">
            {!mutualSent ? (
              <>
                <p className="mb-3 text-sm text-white/50">
                  Оба нажимают «Я тут» — и тренировка подтверждена
                </p>
                <button
                  type="button"
                  onClick={handleMutualConfirm}
                  className="w-full rounded-xl py-3 text-sm font-medium"
                  style={{ background: "#C9A84C", color: "#0A0A0A" }}
                >
                  🤝 Я тут!
                </button>
              </>
            ) : (
              <div className="py-4">
                <div
                  className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                  style={{
                    borderColor: "#C9A84C",
                    borderTopColor: "transparent",
                  }}
                />
                <p className="text-sm text-white/60">
                  Ждём подтверждение тренера...
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Попроси тренера нажать «Подтвердить» в приложении
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TrainerCodeDisplay({ trainerId }: { trainerId: string }) {
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      setCode(generateTrainerCode(trainerId));
      const now = Date.now();
      const slotEnd =
        Math.ceil(now / CODE_ROTATION_MS) * CODE_ROTATION_MS;
      setTimeLeft(Math.round((slotEnd - now) / 1000 / 60));
    };
    update();
    const interval = setInterval(update, 10_000);
    return () => clearInterval(interval);
  }, [trainerId]);

  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{
        background: "rgba(201,168,76,0.06)",
        border: "0.5px solid rgba(201,168,76,0.2)",
      }}
    >
      <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
        Код для клиента
      </p>
      <div className="mb-3 flex justify-center gap-3">
        {code.split("").map((digit, i) => (
          <div
            key={i}
            className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold"
            style={{
              background: "rgba(201,168,76,0.15)",
              color: "#C9A84C",
              border: "1px solid rgba(201,168,76,0.3)",
            }}
          >
            {digit}
          </div>
        ))}
      </div>
      <p className="text-xs text-white/30">
        Обновится через {timeLeft} мин
      </p>
      <p className="mt-1 text-xs text-white/20">
        Назови код клиенту после тренировки
      </p>
    </div>
  );
}
