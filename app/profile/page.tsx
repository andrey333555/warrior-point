import type { Metadata } from "next";
import MyTrainings from "@/components/my-trainings";

export const metadata: Metadata = {
  title: "Мои тренировки · Warrior Point",
  description: "Ближайшие тренировки и история записей",
};

export default function ProfilePage() {
  return <MyTrainings />;
}
