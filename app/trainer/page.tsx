import type { Metadata } from "next";
import TrainerQrPage from "@/components/trainer-qr-page";
import {
  DEFAULT_SESSION_TRAINER_ID,
  resolveSessionTrainer,
} from "@/lib/session-complete";

export const metadata: Metadata = {
  title: "QR тренера · Warrior Point",
  description: "QR-код для завершения тренировки",
};

type PageProps = {
  searchParams: Promise<{
    trainerId?: string;
  }>;
};

export default async function TrainerQrRoute({ searchParams }: PageProps) {
  const sp = await searchParams;
  const parsed = sp.trainerId
    ? Number.parseInt(sp.trainerId, 10)
    : DEFAULT_SESSION_TRAINER_ID;
  const trainerId = Number.isFinite(parsed)
    ? parsed
    : DEFAULT_SESSION_TRAINER_ID;
  const { id, name } = resolveSessionTrainer(trainerId);

  return <TrainerQrPage trainerId={id} trainerName={name} />;
}
