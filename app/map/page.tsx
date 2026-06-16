/**
 * /map — Warrior Point · Cyber Map + Split Booking (client fintech engine)
 */

import type { Metadata } from "next";
import MapScreen from "@/components/map-screen";

export const metadata: Metadata = {
  title: "Warrior Network Map · Сплиты",
  description:
    "Интерактивная карта залов Warrior Point с авто-геолокацией и записью на сплит-сессии.",
};

export default function MapPage() {
  return <MapScreen />;
}
