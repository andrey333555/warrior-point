import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TrainerPage from "@/components/trainer-page";
import { findTrainer, trainers } from "@/lib/network";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return trainers.map((trainer) => ({ id: String(trainer.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const trainer = findTrainer(id);

  if (!trainer) {
    return { title: "Тренер не найден · Warrior Point" };
  }

  return {
    title: `${trainer.name} · Warrior Point`,
    description: `${trainer.experience} опыта · сплиты и запись`,
  };
}

export default async function TrainerRoutePage({ params }: PageProps) {
  const { id } = await params;
  const trainer = findTrainer(id);

  if (!trainer) {
    notFound();
  }

  return <TrainerPage trainer={trainer} />;
}
