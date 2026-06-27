"use client";

import TrainerCard from "./TrainerCard";
import ScheduleDates from "./ScheduleDates";
import ScheduleTimes from "./ScheduleTimes";
import BookingSummary from "./BookingSummary";
import { trainers } from "@/lib/data";

type GymTrainersProps = {
  gymName: string;
};

export default function GymTrainers({ gymName }: GymTrainersProps) {
  const trainingPrice = trainers[0]?.trainings[0]?.price ?? 1500;

  return (
    <div className="mt-6">
      <ScheduleDates />
      <ScheduleTimes />

      <div className="mt-4">
        {trainers.map((t) => (
          <TrainerCard key={t.id} trainer={t} />
        ))}
      </div>

      <BookingSummary trainingPrice={trainingPrice} gymName={gymName} />

      <button
        type="button"
        className="mt-4 w-full rounded-2xl bg-yellow-400 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        Записаться
      </button>
    </div>
  );
}
