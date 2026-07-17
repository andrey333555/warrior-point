"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ═══════════════════════════════════════════════════════════════
// ДАННЫЕ (mock → Supabase)
// ═══════════════════════════════════════════════════════════════

type Story = {
  id: string;
  title: string;
  photo: string;
  isNew?: boolean;
  link: string;
};

type Promo = {
  tag: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
  link: string;
};

const STORIES: Story[] = [
  {
    id: "1",
    title: "Путь к 10 раунду",
    photo:
      "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=400&q=80",
    isNew: true,
    link: "/stories/1",
  },
  {
    id: "2",
    title: "Топ залов Краснодара",
    photo:
      "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=400&q=80",
    isNew: true,
    link: "/stories/2",
  },
  {
    id: "3",
    title: "Тренировка с Волковым",
    photo:
      "https://images.unsplash.com/photo-1552072805-f9a7be36c5c9?w=400&q=80",
    link: "/stories/3",
  },
  {
    id: "4",
    title: "Как работает ELO",
    photo:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80",
    link: "/stories/4",
  },
];

const PROMOS: Promo[] = [
  {
    tag: "НОВЫЙ ТРЕНЕР",
    title: "Шлеменко в Кузне",
    subtitle: "Осталось 2 места на неделю",
    emoji: "🥊",
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
    link: "/trainer/1",
  },
  {
    tag: "СТРАХОВКА",
    title: "Тренируйся спокойно",
    subtitle: "199 ₽ · выплата за 72 часа",
    emoji: "🛡️",
    gradient: "linear-gradient(135deg, #16213e, #0f3460)",
    link: "/booking/1",
  },
];

type UserData = {
  name: string;
  initials: string;
  round: number;
  roundLabel: string;
  elo: number;
  xp: number;
  streak: number;
  record: string;
  isVIP: boolean;
  city: string;
  gymsNearby: number;
};

const DEMO_USER: UserData = {
  name: "Cobra",
  initials: "КI",
  round: 13,
  roundLabel: "Мастер",
  elo: 2185,
  xp: 14626,
  streak: 5,
  record: "27-4-1",
  isVIP: true,
  city: "Краснодар",
  gymsNearby: 19,
};

export default function HomeHub() {
  const router = useRouter();
  const [user] = useState<UserData>(DEMO_USER);

  return (
    <div
      className="relative mx-auto min-h-screen max-w-[420px] pb-24"
      style={{ background: "#0A0A0A" }}
    >
      {/* ═══════ HERO SECTION ═══════ */}
      <div className="relative pb-5">
        <div className="absolute inset-x-0 top-0 h-[420px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80"
            className="h-full w-full object-cover"
            alt="gym"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.6) 50%, #0A0A0A 100%)",
            }}
          />
        </div>

        <div className="relative flex items-center justify-between px-4 pb-4 pt-12">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <polygon
                points="14,2 26,8 26,20 14,26 2,20 2,8"
                stroke="#C9A84C"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span className="text-sm font-bold tracking-widest text-white">
              ROUND 23
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user.isVIP ? (
              <div
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span className="text-xs">⚡</span>
                <span className="text-xs font-semibold text-white">VIP</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/vip")}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
                style={{ background: "rgba(201,168,76,0.9)" }}
              >
                <span className="text-xs">⚡</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: "#0A0A0A" }}
                >
                  Стать VIP
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "#C9A84C", color: "#0A0A0A" }}
            >
              {user.initials}
            </button>
          </div>
        </div>

        <div className="relative px-4 pb-4">
          <button
            type="button"
            onClick={() => router.push("/?tab=passport")}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              border: "0.5px solid rgba(255,255,255,0.12)",
            }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-base"
              style={{ background: "rgba(201,168,76,0.2)" }}
            >
              🔥
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white">
                Раунд {user.round} · {user.roundLabel}
              </p>
              <p className="text-xs text-white/50">
                {user.streak} дней подряд · {user.xp.toLocaleString("ru-RU")}{" "}
                XP
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p
                className="text-base font-extrabold"
                style={{ color: "#C9A84C" }}
              >
                {user.elo}
              </p>
              <p className="text-white/40" style={{ fontSize: 9 }}>
                ELO
              </p>
            </div>
          </button>
        </div>

        <div className="relative space-y-2 px-4">
          <button
            type="button"
            onClick={() => router.push("/map")}
            className="relative w-full overflow-hidden rounded-3xl p-5 text-left"
            style={{
              background: "rgba(201,168,76,0.85)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="absolute -right-3 -top-3 text-8xl opacity-15">
              🥊
            </div>
            <div className="relative">
              <p
                className="mb-0.5 text-xl font-extrabold"
                style={{ color: "#0A0A0A" }}
              >
                Тренироваться
              </p>
              <p className="text-xs" style={{ color: "rgba(10,10,10,0.65)" }}>
                Выбери тренера · от 1 500 ₽
              </p>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <Tile
              icon="📍"
              title="Залы рядом"
              subtitle={`${user.gymsNearby} в ${user.city}`}
              onClick={() => router.push("/map")}
            />
            <Tile
              icon="👤"
              title="Мой паспорт"
              subtitle={`${user.record} · R${user.round}`}
              onClick={() => router.push("/?tab=passport")}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <SmallTile
              icon="🏆"
              title="Рейтинг"
              onClick={() => router.push("/leaderboard")}
            />
            <SmallTile
              icon="🎁"
              title="Пригласить"
              onClick={() => router.push("/referral")}
            />
            <SmallTile
              icon="🎬"
              title="Видео"
              onClick={() => router.push("/?tab=passport")}
            />
          </div>
        </div>

        {!user.isVIP ? (
          <div className="relative px-4 pt-3">
            <button
              type="button"
              onClick={() => router.push("/vip")}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
              style={{
                background: "rgba(30,30,30,0.9)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base"
                style={{ background: "rgba(201,168,76,0.15)" }}
              >
                ⚡
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  VIP · 990 ₽/мес
                </p>
                <p className="text-xs text-white/40">
                  -20% на сплиты + топ-тренеры
                </p>
              </div>
              <span className="text-base text-white/30">›</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="pb-4 pt-2">
        <h2 className="mb-3 px-4 text-xl font-bold text-white">Истории</h2>
        <div className="scrollbar-hide flex gap-2.5 overflow-x-auto px-4">
          {STORIES.map((story) => (
            <button
              key={story.id}
              type="button"
              onClick={() => router.push(story.link)}
              className="relative flex-shrink-0 overflow-hidden rounded-2xl"
              style={{
                width: 110,
                aspectRatio: "3/4",
                border: story.isNew
                  ? "2px solid #C9A84C"
                  : "2px solid rgba(201,168,76,0.35)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.photo}
                className="h-full w-full object-cover"
                alt={story.title}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.9), transparent 60%)",
                }}
              />
              {story.isNew ? (
                <div
                  className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 font-bold"
                  style={{
                    background: "#C9A84C",
                    color: "#0A0A0A",
                    fontSize: 8,
                  }}
                >
                  НОВОЕ
                </div>
              ) : null}
              <p className="absolute bottom-2 left-2 right-2 text-left text-xs font-semibold leading-tight text-white">
                {story.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="pb-6">
        <h2 className="mb-3 px-4 text-xl font-bold text-white">
          Не пропустите
        </h2>
        <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4">
          {PROMOS.map((promo) => (
            <button
              key={promo.tag}
              type="button"
              onClick={() => router.push(promo.link)}
              className="relative flex-shrink-0 overflow-hidden rounded-2xl p-4 text-left"
              style={{ width: 280, background: promo.gradient }}
            >
              <div className="absolute -bottom-5 -right-5 text-8xl opacity-10">
                {promo.emoji}
              </div>
              <div className="relative">
                <p
                  className="mb-1 text-xs font-semibold tracking-wider"
                  style={{ color: "#C9A84C" }}
                >
                  {promo.tag}
                </p>
                <p className="mb-0.5 text-lg font-bold text-white">
                  {promo.title}
                </p>
                <p className="text-xs text-white/50">{promo.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl p-4 text-left"
      style={{
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(16px)",
        border: "0.5px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="mb-1.5 text-2xl">{icon}</div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>
    </button>
  );
}

function SmallTile({
  icon,
  title,
  onClick,
}: {
  icon: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl px-2 py-3.5 text-center"
      style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="mb-1 text-lg">{icon}</div>
      <p className="text-xs font-medium text-white">{title}</p>
    </button>
  );
}
