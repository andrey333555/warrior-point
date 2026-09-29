"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, User, MapPin, Zap } from "lucide-react";
import {
  cityFromClub,
  type FighterOnboardingData,
} from "@/lib/fighter-onboarding";

export type FighterData = FighterOnboardingData;

const CLUBS = [
  "Кузня · Краснодар",
  "Кузня · Анапа",
  "Кузня · Екатеринодар",
  "Warrior Point · Питер",
  "Другой",
];

const STYLES = [
  { id: "mma", label: "ММА", icon: "🥊" },
  { id: "boxing", label: "Бокс", icon: "🥊" },
  { id: "muay-thai", label: "Муай-тай", icon: "🦵" },
  { id: "kickboxing", label: "Кикбоксинг", icon: "👟" },
  { id: "wrestling", label: "Борьба", icon: "🤼" },
  { id: "bjj", label: "BJJ", icon: "🥋" },
];

export default function FighterOnboarding({
  onComplete,
}: {
  onComplete: (data: FighterData) => void;
}) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<FighterData>>({});

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const canProceed = () => {
    if (step === 1) return Boolean(data.name?.trim() && data.club);
    if (step === 2) return Boolean(data.style);
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }
    const name = data.name?.trim() ?? "";
    const club = data.club ?? "";
    const style = data.style ?? "mma";
    onComplete({
      name,
      nickname: data.nickname?.trim() || undefined,
      city: data.city || cityFromClub(club),
      club,
      style,
      weight: data.weight,
      height: data.height,
      record: data.record?.trim() || undefined,
    });
  };

  const setClub = (club: string) => {
    setData({ ...data, club, city: cityFromClub(club) });
  };

  const parseOptionalInt = (raw: string): number | undefined => {
    if (!raw.trim()) return undefined;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  return (
    <div className="mx-auto w-full max-w-md overflow-x-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
            Шаг {step} из {totalSteps}
          </span>
          <span className="text-xs text-gray-500">~60 сек</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <User className="text-yellow-400" size={20} />
              <h2 className="text-xl font-bold text-white">Кто ты?</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Имя *</label>
                <input
                  type="text"
                  autoFocus
                  autoComplete="name"
                  placeholder="Александр Иванов"
                  value={data.name || ""}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">
                  Прозвище (опционально)
                </label>
                <input
                  type="text"
                  placeholder='"Кобра"'
                  value={data.nickname || ""}
                  onChange={(e) => setData({ ...data, nickname: e.target.value })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-sm text-gray-400">
                  <MapPin size={14} />
                  Клуб *
                </label>
                <div className="space-y-2">
                  {CLUBS.map((club) => (
                    <button
                      key={club}
                      type="button"
                      onClick={() => setClub(club)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                        data.club === club
                          ? "border-yellow-400 bg-yellow-400/10 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {club}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {step === 2 ? (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Zap className="text-yellow-400" size={20} />
              <h2 className="text-xl font-bold text-white">Твой стиль</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setData({ ...data, style: s.id })}
                  className={`rounded-2xl border p-4 transition-all ${
                    data.style === s.id
                      ? "scale-105 border-yellow-400 bg-yellow-400/10"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600"
                  }`}
                >
                  <div className="mb-1 text-3xl">{s.icon}</div>
                  <div className="text-sm font-semibold text-white">{s.label}</div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        {step === 3 ? (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Check className="text-yellow-400" size={20} />
              <h2 className="text-xl font-bold text-white">Почти готово!</h2>
            </div>

            <p className="mb-4 text-sm text-gray-400">
              Можешь заполнить сейчас или позже:
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Вес (кг)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="75"
                    value={data.weight ?? ""}
                    onChange={(e) =>
                      setData({ ...data, weight: parseOptionalInt(e.target.value) })
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Рост (см)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="180"
                    value={data.height ?? ""}
                    onChange={(e) =>
                      setData({ ...data, height: parseOptionalInt(e.target.value) })
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  Рекорд (W-L-D)
                </label>
                <input
                  type="text"
                  placeholder="27-6-0"
                  value={data.record || ""}
                  onChange={(e) => setData({ ...data, record: e.target.value })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-yellow-400"
                />
              </div>

              <p className="text-xs text-gray-500">
                🤖 AI подгрузит статистику с Sherdog автоматически, если есть.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-6 flex gap-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-xl bg-gray-800 px-4 py-3 text-gray-400 transition-colors hover:bg-gray-700"
          >
            Назад
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed()}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-bold transition-all ${
            canProceed()
              ? "bg-yellow-400 text-black hover:bg-yellow-500 active:scale-[0.98]"
              : "cursor-not-allowed bg-gray-800 text-gray-600"
          }`}
        >
          {step === totalSteps ? "Создать паспорт" : "Далее"}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
