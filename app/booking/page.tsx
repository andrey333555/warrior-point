import type { Metadata } from "next";
import BookingPage from "@/components/booking-page";

export const metadata: Metadata = {
  title: "Запись · Warrior Point",
  description: "Запись на тренировку с тренером",
};

export default function BookingRoutePage() {
  return <BookingPage />;
}
