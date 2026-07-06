import type { Metadata } from "next";
import ProfilePage from "@/components/profile-page";

export const metadata: Metadata = {
  title: "Профиль · Warrior Point",
  description: "Прогресс, тренировки, тренеры и достижения",
};

export default function ProfileRoutePage() {
  return <ProfilePage />;
}
