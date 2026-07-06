import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChatPage from "@/components/chat-page";
import { findTrainer, trainers } from "@/lib/network";

type PageProps = {
  params: Promise<{ trainerId: string }>;
};

export function generateStaticParams() {
  return trainers.map((t) => ({ trainerId: String(t.id) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { trainerId } = await params;
  const trainer = findTrainer(trainerId);
  if (!trainer) return { title: "Чат · Warrior Point" };
  return {
    title: `Чат · ${trainer.name} · Warrior Point`,
    description: "Сообщения с тренером",
  };
}

export default async function ChatRoutePage({ params }: PageProps) {
  const { trainerId } = await params;
  const trainer = findTrainer(trainerId);
  if (!trainer) notFound();
  return <ChatPage trainer={trainer} />;
}
