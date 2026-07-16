"use client";

/**
 * Home hub — OneTwoTrip / Yandex-style action entry.
 * Mock data (DEMO_USER, STORIES, PROMOS) → Supabase later.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_GYM_IMAGE } from "@/lib/gym-display";

// ── Mock data (→ Supabase) ───────────────────────────────────────────────────

const DEMO_USER = {
  name: "King",
  greeting: "Готов к бою",
  avatar: "/fighters/king-ufc-portrait.png",
  streak: 5,
  nextSession: "Сегодня · 18:00",
};

const STORIES = [
  {
    id: "s1",
    label: "Твой зал",
    image: DEFAULT_GYM_IMAGE,
    href: "/map",
  },
  {
    id: "s2",
    label: "Сплит",
    image:
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=200&q=80",
    href: "/booking/1",
  },
  {
    id: "s3",
    label: "Топ",
    image:
      "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=200&q=80",
    href: "/?tab=leaderboard",
  },
  {
    id: "s4",
    label: "Паспорт",
    image: "/fighters/king-ufc-portrait.png",
    href: "/?tab=passport",
  },
  {
    id: "s5",
    label: "Реферал",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&q=80",
    href: "/referral",
  },
] as const;

const PROMOS = [
  {
    id: "p1",
    title: "Первый сплит −20%",
    subtitle: "Запишись сегодня · кэшбэк в паспорт",
    href: "/booking/1",
    accent: "#C9A84C",
  },
  {
    id: "p2",
    title: "Приведи друга",
    subtitle: "300₽ тебе и другу после тренировки",
    href: "/referral",
    accent: "#22c55e",
  },
  {
    id: "p3",
    title: "Добавь свой зал",
    subtitle: "Зал в сети Warrior Point",
    href: "/gym/register",
    accent: "#3b82f6",
  },
] as const;

const SECONDARY_TILES = [
  { id: "map", label: "Карта залов", emoji: "🗺", href: "/map" },
  { id: "passport", label: "Паспорт", emoji: "🪪", href: "/?tab=passport" },
  { id: "top", label: "Топ бойцов", emoji: "🏆", href: "/?tab=leaderboard" },
  { id: "profile", label: "Профиль", emoji: "⚙️", href: "/profile" },
] as const;

// ── UI ───────────────────────────────────────────────────────────────────────

function GlassTile({
  href,
  emoji,
  label,
}: {
  href: string;
  emoji: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-start justify-between rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl transition active:scale-[0.98]"
      style={{
        boxShadow: "0 8px 32px -12px rgba(0,0,0,0.45)",
        minHeight: 96,
      }}
    >
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="text-sm font-semibold text-white">{label}</span>
    </Link>
  );
}

export default function HomeHub() {
  const router = useRouter();

  return (
    <div className="relative mx-auto min-h-[100dvh] max-w-[420px] overflow-hidden text-white">
      {/* Full-bleed gym photo */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={DEFAULT_GYM_IMAGE}
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.18),transparent_55%)]" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Header */}
        <header className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/?tab=passport")}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/25 bg-black/30"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DEMO_USER.avatar}
              alt={DEMO_USER.name}
              className="h-full w-full object-cover object-[center_15%]"
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-white">
              Привет, {DEMO_USER.name}
            </p>
            <p className="truncate text-xs text-white/60">
              {DEMO_USER.greeting}
              {DEMO_USER.streak > 0 ? ` · 🔥 ${DEMO_USER.streak} дн` : ""}
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/70 backdrop-blur-md"
          >
            Тема
          </Link>
        </header>

        {DEMO_USER.nextSession ? (
          <p className="mb-4 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-center text-[11px] text-white/75 backdrop-blur-md">
            Ближайшая · {DEMO_USER.nextSession}
          </p>
        ) : null}

        {/* Primary money CTA */}
        <button
          type="button"
          onClick={() => router.push("/map")}
          className="mb-3 flex w-full items-center justify-between rounded-2xl px-5 py-5 text-left transition active:scale-[0.98]"
          style={{
            background: "#C9A84C",
            color: "#0A0A0A",
            boxShadow: "0 12px 40px -8px rgba(201,168,76,0.55)",
          }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
              Главное действие
            </p>
            <p className="mt-0.5 text-xl font-black">🥊 Тренироваться</p>
            <p className="mt-1 text-xs font-medium opacity-70">
              Зал · тренер · оплата
            </p>
          </div>
          <span className="text-2xl font-light opacity-60">→</span>
        </button>

        {/* Glass action tiles */}
        <div className="mb-6 grid grid-cols-2 gap-2.5">
          {SECONDARY_TILES.map((tile) => (
            <GlassTile
              key={tile.id}
              href={tile.href}
              emoji={tile.emoji}
              label={tile.label}
            />
          ))}
        </div>

        {/* Stories */}
        <section className="mb-5">
          <p className="mb-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Истории
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STORIES.map((story) => (
              <Link
                key={story.id}
                href={story.href}
                className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
              >
                <div
                  className="h-[72px] w-[72px] overflow-hidden rounded-full p-[2px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #C9A84C, rgba(255,255,255,0.35))",
                  }}
                >
                  <div className="h-full w-full overflow-hidden rounded-full border-2 border-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={story.image}
                      alt={story.label}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <span className="w-full truncate text-center text-[10px] text-white/70">
                  {story.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Promos */}
        <section className="space-y-2.5">
          <p className="mb-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Для тебя
          </p>
          {PROMOS.map((promo) => (
            <Link
              key={promo.id}
              href={promo.href}
              className="block rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl transition active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: promo.accent,
                    boxShadow: `0 0 12px ${promo.accent}88`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {promo.title}
                  </p>
                  <p className="mt-0.5 text-xs text-white/55">{promo.subtitle}</p>
                </div>
                <span className="text-white/35">→</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
