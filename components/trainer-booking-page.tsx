"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getGymsForTrainer, type Gym, type Trainer } from "@/lib/network";
import { usePayment } from "@/lib/usePayment";
import { splitSettlement } from "@/lib/economy";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";

type TrainerBookingPageProps = {
  trainer: Trainer;
};

const DATES = [
  { id: "today", label: "Сегодня" },
  { id: "tomorrow", label: "Завтра" },
  { id: "jun-30", label: "30 июн" },
  { id: "jul-01", label: "1 июл" },
] as const;

const SLOTS = ["10:00", "12:00", "18:00", "20:00"] as const;

const TRAINING_TYPES = [
  { id: "individual", label: "Индивидуальная", hint: "1-на-1 с тренером", price: 3000 },
  { id: "group", label: "Группа", hint: "до 8 человек", price: 1000 },
  { id: "split", label: "Сплит", hint: "целевая программа", price: 2000 },
] as const;

type TrainingTypeId = (typeof TRAINING_TYPES)[number]["id"];
type Screen = "booking" | "payment";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-sm text-gray-400">{children}</p>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default function TrainerBookingPage({ trainer }: TrainerBookingPageProps) {
  const router = useRouter();
  const trainerGyms = getGymsForTrainer(trainer.id);

  const [selectedGym, setSelectedGym] = useState<Gym | undefined>(trainerGyms[0]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [trainingType, setTrainingType] = useState<TrainingTypeId>("split");
  const [screen, setScreen] = useState<Screen>("booking");
  const { paying, error: paymentError, pay, clearError } = usePayment();

  const canProceed = !!selectedGym && !!selectedDate && !!selectedTime;

  const dateLabel = DATES.find((d) => d.id === selectedDate)?.label ?? "—";
  const typeData = TRAINING_TYPES.find((t) => t.id === trainingType)!;
  const settlement = splitSettlement(typeData.price);

  const handlePay = async () => {
    if (paying || !selectedGym || !selectedTime) return;

    await pay({
      trainerId: trainer.id,
      trainerName: trainer.name,
      gymName: selectedGym.name,
      date: dateLabel,
      time: selectedTime,
      trainingType,
      grossRub: typeData.price,
    });
  };

  // ── Payment ────────────────────────────────────────────────────────────────
  if (screen === "payment") {
    return (
      <div className="flex min-h-screen flex-col bg-black px-5 pb-24 pt-6 text-white">
        <header className="mb-8">
          <button
            type="button"
            onClick={() => setScreen("booking")}
            className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
          >
            ← Назад
          </button>
        </header>

        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-yellow-400/80">
          Оплата тренировки
        </p>
        <h1 className="mt-1 text-2xl font-bold">{trainer.name}</h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-8 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <Row label="Тренер" value={trainer.name} />
          <Row label="Зал" value={selectedGym?.name ?? "—"} />
          <Row label="Дата" value={dateLabel} />
          <Row label="Время" value={selectedTime ?? "—"} />
          <Row label="Тип" value={typeData.label} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 24 }}
          className="mt-8 rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.06] p-6 text-center"
        >
          <p className="text-sm text-gray-400">К оплате</p>
          <p className="mt-2 font-[family-name:var(--font-jetbrains-mono)] text-5xl font-bold text-white">
            {typeData.price.toLocaleString("ru-RU")}₽
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {typeData.label} · комиссия 19% ({settlement.commission}₽) · тренеру {settlement.net}₽
          </p>
        </motion.div>

        <div className="mt-auto space-y-3 pt-8">
          {paymentError ? (
            <ErrorMessage message={paymentError} onRetry={clearError} />
          ) : null}
          <Button
            fullWidth
            size="lg"
            loading={paying}
            disabled={paying}
            onClick={handlePay}
          >
            {paying ? "Создаём платёж…" : `Войти в бой · ${typeData.price.toLocaleString("ru-RU")}₽`}
          </Button>
          <p className="text-center text-[10px] text-gray-600">
            ЮKassa · карта / SberPay / СБП
          </p>
        </div>
      </div>
    );
  }

  // ── Booking form ───────────────────────────────────────────────────────────
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-black pb-24 text-white">
      <header className="px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-neutral-400"
        >
          ← Назад
        </button>
      </header>

      <div className="px-4">
        <p className="font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-[0.22em] text-yellow-400/80">
          Запись к тренеру
        </p>
        <h1 className="mt-1 text-2xl font-bold">{trainer.name}</h1>
        {selectedGym ? (
          <p className="mt-1 text-sm text-gray-400">{selectedGym.name}</p>
        ) : null}
      </div>

      {trainerGyms.length > 1 ? (
        <div className="mt-7 px-4">
          <SectionLabel>Выбор зала</SectionLabel>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trainerGyms.map((gym) => {
              const active = selectedGym?.id === gym.id;
              return (
                <button
                  key={gym.id}
                  type="button"
                  onClick={() => {
                    setSelectedGym(gym);
                    setSelectedTime(null);
                  }}
                  className={`w-[60vw] max-w-[240px] shrink-0 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    active
                      ? "border-yellow-400 bg-yellow-400/10"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <p className="truncate font-semibold text-white">{gym.name}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {gym.locationHint ?? gym.note ?? gym.city}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-7 px-4">
        <SectionLabel>Дата</SectionLabel>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DATES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDate(d.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm ${
                selectedDate === d.id ? "bg-yellow-400 text-black" : "bg-zinc-800"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 px-4">
        <SectionLabel>Время</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {SLOTS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTime(t)}
              className={`rounded-xl py-3.5 text-sm ${
                selectedTime === t ? "bg-yellow-400 text-black" : "bg-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 px-4">
        <SectionLabel>Тип тренировки</SectionLabel>
        <div className="space-y-2">
          {TRAINING_TYPES.map((tt) => {
            const active = trainingType === tt.id;
            return (
              <button
                key={tt.id}
                type="button"
                onClick={() => setTrainingType(tt.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                  active
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <div>
                  <p className="font-semibold text-white">{tt.label}</p>
                  <p className="text-xs text-gray-500">{tt.hint}</p>
                </div>
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-sm font-semibold text-yellow-400">
                  {tt.price.toLocaleString("ru-RU")}₽
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.06] bg-black/95 p-4 backdrop-blur-md">
        <Button
          fullWidth
          size="lg"
          disabled={!canProceed}
          onClick={() => setScreen("payment")}
        >
          {canProceed
            ? `Перейти к оплате · ${typeData.price.toLocaleString("ru-RU")}₽`
            : "Выберите дату и время"}
        </Button>
      </div>
    </div>
  );
}
