"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  REFERRAL_TIERS,
  getNextTierProgress,
  getShareLinks,
  getShareText,
  type ReferralData,
} from "@/lib/referral";

// Mock данные (потом из Supabase)
const MOCK_REFERRAL: ReferralData = {
  referralCode: "COBRA-A1B2",
  totalInvited: 4,
  activeReferrals: 3,
  totalEarned: 1200,
  pendingBonus: 300,
  tier: REFERRAL_TIERS[1],
};

const MOCK_FRIENDS = [
  {
    name: "Алексей С.",
    status: "active",
    earned: 300,
    date: "2 дня назад",
    avatar: "🥊",
  },
  {
    name: "Дмитрий К.",
    status: "active",
    earned: 400,
    date: "5 дней назад",
    avatar: "💪",
  },
  {
    name: "Мария В.",
    status: "active",
    earned: 300,
    date: "1 неделю назад",
    avatar: "⚡",
  },
  {
    name: "Игорь П.",
    status: "pending",
    earned: 0,
    date: "Вчера",
    avatar: "🆕",
  },
];

export default function ReferralPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const ref = MOCK_REFERRAL;
  const { current, next, progress, friendsNeeded } = getNextTierProgress(
    ref.totalInvited,
  );
  const shareLinks = getShareLinks(ref.referralCode, "COBRA");

  const handleBack = () => {
    router.push("/profile");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLinks.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Round 23",
          text: getShareText(ref.referralCode, "COBRA"),
          url: shareLinks.copy,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      setShowShare(!showShare);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0A0A0A" }}>
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-4"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Назад"
          className="-ml-1 rounded-lg p-2 text-white/50 transition-colors hover:text-white active:scale-95"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <h1 className="font-medium text-white">Пригласи друга</h1>
      </div>

      <div className="space-y-5 px-4 pt-5">
        <div
          className="rounded-2xl py-4 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, rgba(201,168,76,0.02) 100%)",
            border: "0.5px solid rgba(201,168,76,0.15)",
          }}
        >
          <div className="mb-3 text-4xl">🎁</div>
          <h2 className="mb-1 text-xl font-semibold text-white">
            Дай другу 300₽
          </h2>
          <p className="text-sm text-white/50">И получи до 1000₽ за каждого</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Приглашено", value: ref.totalInvited, icon: "👥" },
            { label: "Заработано", value: `${ref.totalEarned}₽`, icon: "💰" },
            { label: "Ожидает", value: `${ref.pendingBonus}₽`, icon: "⏳" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3 text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "0.5px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-lg">{s.icon}</span>
              <p className="mt-1 text-base font-semibold text-white">
                {s.value}
              </p>
              <p className="text-xs text-white/30">{s.label}</p>
            </div>
          ))}
        </div>

        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(201,168,76,0.06)",
            border: "0.5px solid rgba(201,168,76,0.2)",
          }}
        >
          <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
            Твой код
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold tracking-widest text-white">
              {ref.referralCode}
            </span>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-xl px-4 py-2 text-sm font-medium transition-all"
              style={
                copied
                  ? {
                      background: "rgba(34,197,94,0.15)",
                      color: "#22c55e",
                      border: "0.5px solid rgba(34,197,94,0.3)",
                    }
                  : {
                      background: "rgba(201,168,76,0.15)",
                      color: "#C9A84C",
                      border: "0.5px solid rgba(201,168,76,0.3)",
                    }
              }
            >
              {copied ? "✅ Скопировано!" : "📋 Копировать"}
            </button>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => void handleNativeShare()}
            className="mb-3 w-full rounded-xl py-3.5 text-sm font-medium"
            style={{ background: "#C9A84C", color: "#0A0A0A" }}
          >
            📤 Поделиться с другом
          </button>

          {showShare && (
            <div className="grid grid-cols-3 gap-2">
              <a
                href={shareLinks.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl py-3 text-center text-sm transition-all"
                style={{
                  background: "rgba(0,136,204,0.15)",
                  border: "0.5px solid rgba(0,136,204,0.3)",
                  color: "#0088CC",
                }}
              >
                ✈️ Telegram
              </a>
              <a
                href={shareLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl py-3 text-center text-sm transition-all"
                style={{
                  background: "rgba(37,211,102,0.15)",
                  border: "0.5px solid rgba(37,211,102,0.3)",
                  color: "#25D366",
                }}
              >
                💬 WhatsApp
              </a>
              <a
                href={shareLinks.vk}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl py-3 text-center text-sm transition-all"
                style={{
                  background: "rgba(0,119,255,0.15)",
                  border: "0.5px solid rgba(0,119,255,0.3)",
                  color: "#0077FF",
                }}
              >
                🔵 VK
              </a>
            </div>
          )}
        </div>

        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{current.badge}</span>
                <div>
                  <p className="font-medium text-white">{current.title}</p>
                  <p className="text-xs text-white/40">
                    +{current.yourBonus}₽ за друга
                  </p>
                </div>
              </div>
              {next && (
                <div className="text-right">
                  <p className="text-xs text-white/30">Следующий</p>
                  <p className="text-sm" style={{ color: "#C9A84C" }}>
                    {next.badge} {next.title}
                  </p>
                </div>
              )}
            </div>

            {next && (
              <>
                <div
                  className="mb-1 h-2 overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: "#C9A84C",
                      boxShadow: "0 0 8px rgba(201,168,76,0.4)",
                    }}
                  />
                </div>
                <p className="text-xs text-white/30">
                  Ещё {friendsNeeded}{" "}
                  {friendsNeeded === 1
                    ? "друг"
                    : friendsNeeded < 5
                      ? "друга"
                      : "друзей"}{" "}
                  до +{next.yourBonus}₽ за каждого
                </p>
              </>
            )}
          </div>

          <div
            className="px-4 pt-1 pb-4"
            style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}
          >
            <p className="mb-2 text-xs uppercase tracking-wider text-white/30">
              Уровни
            </p>
            <div className="space-y-1.5">
              {REFERRAL_TIERS.map((t) => {
                const reached = ref.totalInvited >= t.friends;
                return (
                  <div
                    key={t.friends}
                    className="flex items-center justify-between py-1.5"
                    style={{ opacity: reached ? 1 : 0.4 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t.badge}</span>
                      <span className="text-xs text-white">{t.title}</span>
                      <span className="text-xs text-white/30">
                        ({t.friends}+ друзей)
                      </span>
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: reached ? "#C9A84C" : "rgba(255,255,255,0.3)",
                      }}
                    >
                      +{t.yourBonus}₽
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
            Приглашённые друзья
          </p>
          <div className="space-y-2">
            {MOCK_FRIENDS.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl p-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "0.5px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                    style={{ background: "rgba(201,168,76,0.1)" }}
                  >
                    {f.avatar}
                  </div>
                  <div>
                    <p className="text-sm text-white">{f.name}</p>
                    <p className="text-xs text-white/30">{f.date}</p>
                  </div>
                </div>
                {f.status === "active" ? (
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#22c55e" }}
                  >
                    +{f.earned}₽
                  </span>
                ) : (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: "rgba(201,168,76,0.1)",
                      color: "#C9A84C",
                    }}
                  >
                    Ожидает
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "0.5px solid rgba(255,255,255,0.05)",
          }}
        >
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
            Как это работает
          </p>
          <div className="space-y-3">
            {[
              {
                step: "1",
                text: "Отправь код другу",
                sub: "Через Telegram, WhatsApp или VK",
              },
              {
                step: "2",
                text: "Друг регистрируется",
                sub: "Вводит код и получает 300₽ бонус",
              },
              {
                step: "3",
                text: "Друг тренируется",
                sub: "Проходит первую тренировку через платформу",
              },
              {
                step: "4",
                text: "Ты получаешь бонус",
                sub: `До ${REFERRAL_TIERS[REFERRAL_TIERS.length - 1].yourBonus}₽ за каждого`,
              },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: "rgba(201,168,76,0.15)",
                    color: "#C9A84C",
                  }}
                >
                  {s.step}
                </div>
                <div>
                  <p className="text-sm text-white">{s.text}</p>
                  <p className="text-xs text-white/30">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
