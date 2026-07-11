import type { Metadata } from "next";
import FavoriteTrainersPicker from "@/components/favorite-trainers-picker";

export const metadata: Metadata = {
  title: "Избранные тренеры · Warrior Point",
  description: "Персональная тренировка — выбор из избранных тренеров",
};

export default function FavoriteTrainersBookingPage() {
  return <FavoriteTrainersPicker />;
}
