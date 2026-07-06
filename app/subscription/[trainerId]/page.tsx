import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SubscriptionPage from "@/components/subscription-page";
import { findTrainer, trainers } from "@/lib/network";

type PageProps = {
  params: Promise<{ trainerId: string }>;
};

export function generateStaticParams() {
  return trainers
    .filter((t) => t.subscriptionEnabled)
    .map((t) => ({ trainerId: String(t.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { trainerId } = await params;
  const trainer = findTrainer(trainerId);

  if (!trainer) return { title: "Подписка · Warrior Point" };

  return {
    title: `Подписка · ${trainer.name} · Warrior Point`,
    description: `Elite access · ${trainer.subscriptionPrice}₽/мес · ${trainer.subscriptionSlots} мест`,
  };
}

export default async function SubscriptionRoutePage({ params }: PageProps) {
  const { trainerId } = await params;
  const trainer = findTrainer(trainerId);

  if (!trainer || !trainer.subscriptionEnabled) {
    notFound();
  }

  return <SubscriptionPage trainer={trainer} />;
}
