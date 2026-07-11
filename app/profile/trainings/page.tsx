import type { Metadata } from "next";
import TrainingsHistoryPage from "@/components/trainings-history-page";

export const metadata: Metadata = {
  title: "Мои тренировки · Warrior Point",
  description: "История и ближайшие тренировки бойца",
};

export default function ProfileTrainingsPage() {
  return <TrainingsHistoryPage />;
}
