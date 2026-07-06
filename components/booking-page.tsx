"use client";

import { useState } from "react";
import {
  bookingDates,
  bookingGym,
  bookingTimes,
  inspiredFighter,
  trainers,
  type TrainingType,
} from "@/lib/data";
import { Button } from "@/components/ui/button";

function FlowArrow() {
  return <p className="py-1 text-center text-lg text-zinc-700">↓</p>;
}

function StepLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <p className="mb-2 text-xs text-gray-500">
      {title}{" "}
      <span className="text-gray-600">({hint})</span>
    </p>
  );
}

export default function BookingPage() {
  const trainer = trainers[0]!;
  const defaultSplit = trainer.trainings[0]!;

  const [selectedSplit, setSelectedSplit] = useState<TrainingType>(defaultSplit);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  return (
    <div className="p-4 text-white">
      <StepLabel title="Боец" hint="вдохновил" />
      <div className="rounded-2xl bg-zinc-900 p-4">
        <h2 className="text-lg font-semibold">{inspiredFighter.name}</h2>
        <p className="text-sm text-gray-400">{inspiredFighter.tag}</p>
      </div>

      <FlowArrow />

      <StepLabel title="Зал" hint="где это реально" />
      <div className="rounded-2xl bg-zinc-900 p-4">
        <h2 className="text-lg font-semibold">{bookingGym.name}</h2>
      </div>

      <FlowArrow />

      <StepLabel title="Тренер" hint="кто научит" />
      <div className="rounded-2xl bg-zinc-900 p-4">
        <h2 className="text-lg font-semibold">{trainer.name}</h2>
        <p className="text-sm text-gray-400">{trainer.experience} опыта</p>
      </div>

      <FlowArrow />

      <StepLabel title="Сплит" hint="что именно" />
      <div className="space-y-2">
        {trainer.trainings.map((t) => {
          const selected = selectedSplit.id === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedSplit(t)}
              className={`flex w-full items-center justify-between rounded-2xl bg-zinc-900 p-4 text-left ${
                selected ? "ring-1 ring-yellow-400/60" : ""
              }`}
            >
              <div>
                <p className="text-sm text-white">{t.name}</p>
                <p className="text-xs text-gray-400">{t.duration}</p>
              </div>
              <span className="text-sm font-semibold text-yellow-400">{t.price}₽</span>
            </button>
          );
        })}
      </div>

      {selectedSplit.fitsYou && selectedSplit.fitsYou.length > 0 ? (
        <div className="mt-3 rounded-2xl bg-zinc-900/60 p-4">
          <p className="text-sm text-gray-400">Подходит тебе, если:</p>
          <ul className="mt-2 space-y-1">
            {selectedSplit.fitsYou.map((item) => (
              <li key={item} className="text-sm text-white">
                — {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <FlowArrow />

      <StepLabel title="Запись" hint="деньги" />

      <div className="mb-5">
        <p className="mb-2 text-sm text-gray-400">Дата</p>
        <div className="flex gap-2 overflow-x-auto">
          {bookingDates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 ${
                selectedDate === d
                  ? "bg-yellow-400 text-black"
                  : "bg-zinc-800 text-white"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-2 text-sm text-gray-400">Время</p>
        <div className="grid grid-cols-4 gap-2">
          {bookingTimes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTime(t)}
              className={`rounded-xl py-3 ${
                selectedTime === t ? "bg-yellow-400 text-black" : "bg-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-zinc-900 p-4">
        <p className="text-sm text-gray-400">
          Сплит: <span className="text-white">{selectedSplit.name}</span>
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Зал: <span className="text-white">{bookingGym.name}</span>
        </p>
        <p className="mt-4 text-sm text-gray-400">Итого</p>
        <p className="mt-1 text-xl font-semibold text-yellow-400">
          {selectedSplit.price}₽
        </p>
      </div>

      <Button fullWidth disabled={!selectedDate || !selectedTime}>
        Подтвердить запись
      </Button>
    </div>
  );
}
