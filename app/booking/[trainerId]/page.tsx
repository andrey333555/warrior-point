import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TrainerBookingPage from "@/components/trainer-booking-page";
import { findTrainer, trainers } from "@/lib/network";

type PageProps = {
  params: Promise<{ trainerId: string }>;
};

export function generateStaticParams() {
  return trainers.map((trainer) => ({ trainerId: String(trainer.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { trainerId } = await params;
  const trainer = findTrainer(trainerId);

  if (!trainer) {
    return { title: "Запись · Warrior Point" };
  }

  return {
    title: `Запись · ${trainer.name} · Warrior Point`,
    description: "Booking flow · выбор зала, даты, времени и типа тренировки",
  };
}

export default async function TrainerBookingRoutePage({ params }: PageProps) {
  const { trainerId } = await params;
  const trainer = findTrainer(trainerId);

  if (!trainer) {
    notFound();
  }

  return <TrainerBookingPage trainer={trainer} />;
}
