"use client";

import { useRouter } from "next/navigation";
import TrainerCard from "./TrainerCard";
import ScheduleDates from "./ScheduleDates";
import ScheduleTimes from "./ScheduleTimes";
import BookingSummary from "./BookingSummary";
import { TrainerFitsYouBlock } from "./trainer-fits-you-block";
import { getTrainersForGym, trainers as allTrainers } from "@/lib/network";

type GymTrainersProps = {
  gymName: string;
  gymId?: number;
};

export default function GymTrainers({ gymName, gymId }: GymTrainersProps) {
  const router = useRouter();
  const gymTrainers = gymId != null ? getTrainersForGym(gymId) : allTrainers;

  return (
    <div className="mt-6">
      <ScheduleDates />
      <ScheduleTimes />

      <div className="mt-4 space-y-6">
        {gymTrainers.map((t) => {
          const trainingPrice = t.trainings[0]?.price ?? 1500;

          return (
            <div key={t.id}>
              <TrainerCard trainer={t} />
              <TrainerFitsYouBlock tips={t.fitsYou} />
              <BookingSummary trainingPrice={trainingPrice} gymName={gymName} />
              <button
                type="button"
                onClick={() => router.push(`/booking/${t.id}`)}
                className="mt-4 w-full rounded-2xl bg-yellow-400 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Записаться
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
