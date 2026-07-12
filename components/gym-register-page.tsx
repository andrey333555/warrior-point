"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GYM_CATEGORIES,
  submitGymRegistration,
  type GymRegistrationForm,
} from "@/lib/gym-register";

type Step = "info" | "photos" | "location" | "review";

const INITIAL: GymRegistrationForm = {
  name: "",
  city: "",
  address: "",
  phone: "",
  description: "",
  categories: [],
  photos: [],
  lat: null,
  lng: null,
  ownerName: "",
  ownerPhone: "",
  schedule: "",
  priceFrom: 0,
  website: "",
  telegram: "",
  instagram: "",
};

export default function GymRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [form, setForm] = useState<GymRegistrationForm>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps: Step[] = ["info", "photos", "location", "review"];
  const currentIndex = steps.indexOf(step);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const update = <K extends keyof GymRegistrationForm>(
    key: K,
    value: GymRegistrationForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (cat: string) => {
    const cats = form.categories.includes(cat)
      ? form.categories.filter((c) => c !== cat)
      : [...form.categories, cat];
    update("categories", cats);
  };

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(
      0,
      3 - form.photos.length,
    );
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({
          ...prev,
          photos: [...prev.photos, reader.result as string].slice(0, 3),
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("lat", pos.coords.latitude);
        update("lng", pos.coords.longitude);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true },
    );
  };

  const canNext = () => {
    switch (step) {
      case "info":
        return (
          !!form.name &&
          !!form.city &&
          !!form.address &&
          form.categories.length > 0
        );
      case "photos":
        return form.photos.length >= 1;
      case "location":
        return form.lat != null && form.lng != null;
      case "review":
        return true;
    }
  };

  const handleSubmit = () => {
    submitGymRegistration(form);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ background: "#0A0A0A" }}
      >
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-white">
          Зал отправлен!
        </h2>
        <p className="mb-2 text-sm text-white/50">
          {form.name} · {form.city}
        </p>
        <p className="mb-8 text-sm text-white/40">
          Мы проверим данные и добавим зал на карту в течение 24 часов. Вам
          придёт уведомление.
        </p>
        <button
          type="button"
          onClick={() => router.push("/map")}
          className="w-full rounded-xl py-4 font-medium"
          style={{ background: "#C9A84C", color: "#0A0A0A" }}
        >
          Перейти на карту
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: "#0A0A0A" }}>
      <div
        className="px-4 pb-4 pt-12"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              currentIndex > 0
                ? setStep(steps[currentIndex - 1]!)
                : router.back()
            }
            className="text-white/50 transition-colors hover:text-white"
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
          <div>
            <h1 className="font-medium text-white">Добавить зал</h1>
            <p className="text-xs text-white/40">
              Шаг {currentIndex + 1} из {steps.length}
            </p>
          </div>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "#C9A84C" }}
          />
        </div>
      </div>

      <div className="space-y-5 px-4 pt-5">
        {step === "info" && (
          <>
            <div>
              <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
                О зале
              </p>
              <div className="space-y-3">
                <Input
                  label="Название зала *"
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  placeholder="Tiger Gym"
                />
                <Input
                  label="Город *"
                  value={form.city}
                  onChange={(v) => update("city", v)}
                  placeholder="Краснодар"
                />
                <Input
                  label="Адрес *"
                  value={form.address}
                  onChange={(v) => update("address", v)}
                  placeholder="ул. Красная, 123"
                />
                <Input
                  label="Телефон"
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  placeholder="+7 (900) 123-45-67"
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
                Направления *
              </p>
              <div className="flex flex-wrap gap-2">
                {GYM_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                    style={
                      form.categories.includes(cat)
                        ? { background: "#C9A84C", color: "#0A0A0A" }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.5)",
                            border: "0.5px solid rgba(255,255,255,0.1)",
                          }
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
                Описание
              </p>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Расскажите о зале, оборудовании, атмосфере..."
                rows={3}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                }}
              />
            </div>

            <div>
              <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
                Дополнительно
              </p>
              <div className="space-y-3">
                <Input
                  label="Расписание"
                  value={form.schedule}
                  onChange={(v) => update("schedule", v)}
                  placeholder="Пн-Сб: 8:00-22:00"
                />
                <Input
                  label="Цена от (₽ за сплит)"
                  value={form.priceFrom ? String(form.priceFrom) : ""}
                  onChange={(v) => update("priceFrom", Number(v) || 0)}
                  placeholder="1000"
                  type="number"
                />
              </div>
            </div>
          </>
        )}

        {step === "photos" && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-white/40">
              Фото зала
            </p>
            <p className="mb-4 text-xs text-white/30">
              Максимум 3 фото. Первое станет обложкой.
            </p>

            <div className="mb-4 grid grid-cols-3 gap-3">
              {form.photos.map((photo, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    className="h-full w-full object-cover"
                    alt={`Фото ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: "rgba(0,0,0,0.7)" }}
                  >
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  {i === 0 ? (
                    <div
                      className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs"
                      style={{
                        background: "#C9A84C",
                        color: "#0A0A0A",
                        fontSize: 9,
                      }}
                    >
                      Обложка
                    </div>
                  ) : null}
                </div>
              ))}

              {form.photos.length < 3 ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(255,255,255,0.15)",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  <span className="text-xs text-white/30">Добавить</span>
                </button>
              ) : null}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotos}
              className="hidden"
            />

            <p className="text-center text-xs text-white/20">
              Хорошие фото = больше клиентов. Покажите ринг, тренажёры,
              атмосферу.
            </p>
          </div>
        )}

        {step === "location" && (
          <>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-white/40">
                Местоположение
              </p>
              <p className="mb-4 text-xs text-white/30">
                Определим координаты зала для карты.
              </p>

              {form.lat != null && form.lng != null ? (
                <div
                  className="mb-4 rounded-xl p-4"
                  style={{
                    background: "rgba(34,197,94,0.06)",
                    border: "0.5px solid rgba(34,197,94,0.2)",
                  }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <p className="text-sm font-medium text-green-400">
                      Локация определена
                    </p>
                  </div>
                  <p className="text-xs text-white/50">
                    {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {form.address}, {form.city}
                  </p>
                </div>
              ) : (
                <div
                  className="mb-4 rounded-xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-center text-sm text-white/50">
                    Нажмите кнопку ниже находясь в зале
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium"
                style={{
                  background: form.lat ? "rgba(255,255,255,0.05)" : "#C9A84C",
                  color: form.lat ? "rgba(255,255,255,0.7)" : "#0A0A0A",
                }}
              >
                {geoLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                    Определяем...
                  </>
                ) : form.lat ? (
                  "🔄 Определить заново"
                ) : (
                  "📍 Определить координаты"
                )}
              </button>

              <p className="mt-3 text-center text-xs text-white/20">
                Или введите координаты вручную:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  label="Широта"
                  value={form.lat != null ? String(form.lat) : ""}
                  onChange={(v) => update("lat", Number(v) || null)}
                  placeholder="45.0355"
                  type="number"
                />
                <Input
                  label="Долгота"
                  value={form.lng != null ? String(form.lng) : ""}
                  onChange={(v) => update("lng", Number(v) || null)}
                  placeholder="38.9753"
                  type="number"
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
                Контакт владельца
              </p>
              <div className="space-y-3">
                <Input
                  label="Ваше имя"
                  value={form.ownerName}
                  onChange={(v) => update("ownerName", v)}
                  placeholder="Олег Перевертунов"
                />
                <Input
                  label="Телефон"
                  value={form.ownerPhone}
                  onChange={(v) => update("ownerPhone", v)}
                  placeholder="+7 (900) 123-45-67"
                />
                <Input
                  label="Telegram"
                  value={form.telegram ?? ""}
                  onChange={(v) => update("telegram", v)}
                  placeholder="@username"
                />
                <Input
                  label="Instagram"
                  value={form.instagram ?? ""}
                  onChange={(v) => update("instagram", v)}
                  placeholder="@gym_name"
                />
              </div>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <div
              className="overflow-hidden rounded-2xl"
              style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}
            >
              {form.photos[0] ? (
                <div className="relative h-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.photos[0]}
                    className="h-full w-full object-cover"
                    alt="cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, #0A0A0A, transparent)",
                    }}
                  />
                  <div className="absolute bottom-3 left-4">
                    <h3 className="text-xl font-bold text-white">{form.name}</h3>
                    <p className="text-xs text-white/50">
                      📍 {form.city} · {form.address}
                    </p>
                  </div>
                </div>
              ) : null}

              <div
                className="space-y-3 p-4"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex flex-wrap gap-1.5">
                  {form.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full px-2 py-1 text-xs"
                      style={{
                        background: "rgba(201,168,76,0.1)",
                        color: "#C9A84C",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>

                {form.description ? (
                  <p className="text-sm text-white/60">{form.description}</p>
                ) : null}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {form.schedule ? (
                    <div>
                      <p className="text-white/30">Расписание</p>
                      <p className="text-white/70">{form.schedule}</p>
                    </div>
                  ) : null}
                  {form.priceFrom > 0 ? (
                    <div>
                      <p className="text-white/30">Цена от</p>
                      <p className="text-white/70">
                        {form.priceFrom.toLocaleString()} ₽
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-white/30">Фото</p>
                    <p className="text-white/70">{form.photos.length} из 3</p>
                  </div>
                  <div>
                    <p className="text-white/30">Геолокация</p>
                    <p className="text-white/70">
                      {form.lat ? "✅ Определена" : "❌ Нет"}
                    </p>
                  </div>
                </div>

                {form.ownerName ? (
                  <div
                    className="pt-2"
                    style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-xs text-white/30">Владелец</p>
                    <p className="text-sm text-white/70">{form.ownerName}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(201,168,76,0.06)",
                border: "0.5px solid rgba(201,168,76,0.15)",
              }}
            >
              <p className="text-center text-xs text-white/60">
                После отправки модерация проверит данные и зал появится на карте
                в течение 24 часов.
              </p>
            </div>
          </>
        )}

        <div className="pt-2">
          {step === "review" ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full rounded-xl py-4 text-base font-semibold"
              style={{
                background: "#C9A84C",
                color: "#0A0A0A",
                boxShadow: "0 4px 24px rgba(201,168,76,0.3)",
              }}
            >
              🏟 Отправить на модерацию
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(steps[currentIndex + 1]!)}
              disabled={!canNext()}
              className="w-full rounded-xl py-4 text-base font-medium transition-all"
              style={
                canNext()
                  ? { background: "#C9A84C", color: "#0A0A0A" }
                  : {
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.2)",
                      cursor: "not-allowed",
                    }
              }
            >
              Далее
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-white/40">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "0.5px solid rgba(255,255,255,0.1)",
        }}
      />
    </div>
  );
}
