import type { Metadata } from "next";
import CompleteSession from "@/components/session-complete-page";

export const metadata: Metadata = {
  title: "Тренировка завершена · Warrior Point",
  description: "Session complete · XP, settlement и обновление паспорта",
};

type PageProps = {
  searchParams: Promise<{
    bookingId?: string;
    trainerId?: string;
    trainer?: string;
    gym?: string;
    gross?: string;
    type?: string;
  }>;
};

export default async function SessionCompleteRoute({ searchParams }: PageProps) {
  const sp = await searchParams;

  const trainerId = sp.trainerId ? Number.parseInt(sp.trainerId, 10) : undefined;
  const grossRub = sp.gross ? Number.parseInt(sp.gross, 10) : undefined;

  return (
    <CompleteSession
      bookingId={sp.bookingId}
      trainerId={Number.isFinite(trainerId) ? trainerId : undefined}
      trainerName={sp.trainer}
      gymName={sp.gym}
      grossRub={Number.isFinite(grossRub) ? grossRub : undefined}
      trainingType={sp.type}
    />
  );
}
