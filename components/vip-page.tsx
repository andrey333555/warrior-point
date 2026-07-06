"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, VIP_PERKS, type PlanId } from "@/lib/subscription";

const VIP_TRAINERS = [
  {
    name: "Александр Шлеменко",
    nickname: "STORM",
    tag: "Чемпион Bellator · MMA",
    minRound: 15,
    photo: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=120&q=80",
    price: 4000,
  },
  {
    name: "Олег Перевертунов",
    nickname: "Основатель Кузни",
    tag: "Global network · MMA · Тренер чемпионов",
    minRound: 10,
    photo: "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=120&q=80",
    price: 3000,
  },
  {
    name: "Сергей Романов",
    nickname: "THE PUNISHER",
    tag: "Чемпион мира · Кикбоксинг",
    minRound: 12,
    photo: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=120&q=80",
    price: 3500,
  },
];

export default function VIPPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanId>("vip_month");
  const [success, setSuccess] = useState(false);

  const plan = PLANS.find((p) => p.id === selected)!;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  if (success) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ background: "#0A0A0A" }}
      >
        <div className="mb-4 text-5xl">👑</div>
        <h2 className="mb-2 text-2xl font-semibold text-white">Добро пожаловать в VIP</h2>
        <p className="mb-8 text-sm text-white/40">
          Теперь тебе доступны все тренеры платформы
        </p>
        <div className="mb-8 w-full space-y-3">
          {VIP_TRAINERS.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-3 rounded-xl p-3 text-left"
              style={{
                background: "rgba(201,168,76,0.08)",
                border: "0.5px solid rgba(201,168,76,0.2)",
              }}
            >
              <img
                src={t.photo}
                className="h-10 w-10 rounded-full object-cover"
                alt={t.name}
              />
              <div>
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-xs text-white/40">{t.tag}</p>
              </div>
              <span className="ml-auto text-sm font-medium" style={{ color: "#C9A84C" }}>
                {t.price.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full rounded-xl py-4 font-medium"
          style={{ background: "#C9A84C", color: "#0A0A0A" }}
        >
          Начать тренироваться
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: "#0A0A0A" }}>
      <div
        className="relative overflow-hidden px-4 pb-8 pt-12 text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(201,168,76,0.12) 0%, transparent 100%)",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Назад"
          className="absolute left-4 top-12 z-20 flex h-10 w-10 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
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

        <div
          className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full"
          style={{
            background: "rgba(201,168,76,0.15)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <div className="relative z-10">
          <div className="mb-3 text-4xl">⚡</div>
          <h1 className="mb-2 text-2xl font-semibold text-white">Round 23 VIP</h1>
          <p className="text-sm leading-relaxed text-white/50">
            Тренируйся у Шлеменко, Перевертунова и Романова.
            <br />
            Без очереди. Со скидкой.
          </p>
        </div>
      </div>

      <div className="space-y-5 px-4">
        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
            Доступны только VIP
          </p>
          <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
            {VIP_TRAINERS.map((t) => (
              <div
                key={t.name}
                className="w-36 shrink-0 overflow-hidden rounded-2xl"
                style={{ border: "0.5px solid rgba(201,168,76,0.2)" }}
              >
                <div className="relative h-28">
                  <img
                    src={t.photo}
                    className="h-full w-full object-cover"
                    alt={t.name}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
                    }}
                  />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-semibold leading-tight text-white">
                      {t.name}
                    </p>
                    <p className="text-xs text-white/50">{t.nickname}</p>
                  </div>
                  <div
                    className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px]"
                    style={{ background: "rgba(201,168,76,0.9)", color: "#0A0A0A" }}
                  >
                    VIP
                  </div>
                </div>
                <div className="p-2" style={{ background: "rgba(201,168,76,0.05)" }}>
                  <p className="text-xs font-medium text-white">
                    {t.price.toLocaleString("ru-RU")} ₽
                  </p>
                  <p className="text-xs text-white/30">за сплит</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
            Выбери план
          </p>
          <div className="space-y-3">
            {PLANS.filter((p) => p.id !== "free").map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className="relative w-full rounded-2xl p-4 text-left transition-all"
                style={
                  selected === p.id
                    ? {
                        background: "rgba(201,168,76,0.1)",
                        border: `1px solid ${p.color}`,
                        boxShadow: "0 0 20px rgba(201,168,76,0.15)",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        border: "0.5px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                {p.popular ? (
                  <div
                    className="absolute -top-2.5 left-4 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: "#C9A84C", color: "#0A0A0A" }}
                  >
                    Популярный
                  </div>
                ) : null}

                <div className="flex items-center justify-between pr-8">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                      style={{
                        background: `rgba(${p.id === "vip_year" ? "239,68,68" : "201,168,76"},0.15)`,
                      }}
                    >
                      {p.badge}
                    </div>
                    <div>
                      <p className="font-medium text-white">{p.name}</p>
                      {p.savings ? (
                        <p className="text-xs" style={{ color: "#C9A84C" }}>
                          {p.savings}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">
                      {p.price.toLocaleString("ru-RU")} ₽
                    </p>
                    <p className="text-xs text-white/40">{p.period}</p>
                    {p.id === "vip_year" && p.pricePerMonth ? (
                      <p className="text-xs" style={{ color: "#C9A84C" }}>
                        {p.pricePerMonth.toLocaleString("ru-RU")} ₽/мес
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      border:
                        selected === p.id
                          ? "none"
                          : "1.5px solid rgba(255,255,255,0.2)",
                      background: selected === p.id ? p.color : "transparent",
                    }}
                  >
                    {selected === p.id ? (
                      <svg width="10" height="10" fill="#0A0A0A" viewBox="0 0 24 24">
                        <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
                      </svg>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Что входит</p>
          <div className="space-y-2">
            {VIP_PERKS.map((perk) => {
              const included = selected === "vip_year" ? perk.elite : perk.vip;

              return (
                <div
                  key={perk.title}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "0.5px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span className="shrink-0 text-lg">{perk.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{perk.title}</p>
                    <p className="mt-0.5 text-xs text-white/40">{perk.desc}</p>
                  </div>
                  <div className="mt-0.5 shrink-0">
                    {included ? (
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="#C9A84C"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(201,168,76,0.06)",
            border: "0.5px solid rgba(201,168,76,0.15)",
          }}
        >
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
            Твоя экономия
          </p>
          <p className="text-sm text-white/70">При 4 сплитах в месяц по 2 000 ₽:</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: "#C9A84C" }}>
              {selected === "vip_year" ? "2 400" : "1 600"} ₽
            </span>
            <span className="text-sm text-white/40">экономия в месяц</span>
          </div>
          <p className="mt-1 text-xs text-white/30">
            Подписка окупается уже с первой тренировки
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSuccess(true)}
          className="w-full rounded-xl py-4 text-base font-semibold transition-all"
          style={{
            background: "#C9A84C",
            color: "#0A0A0A",
            boxShadow: "0 0 24px rgba(201,168,76,0.3)",
          }}
        >
          Подключить {plan.name} · {plan.price.toLocaleString("ru-RU")} ₽
        </button>

        <p className="pb-2 text-center text-xs text-white/20">
          🔒 Безопасная оплата · Отмена в любой момент
        </p>
      </div>
    </div>
  );
}
