import type { Metadata } from "next";
import FighterRegisterPage from "@/components/fighter-register-page";

export const metadata: Metadata = {
  title: "Создать паспорт · Warrior Point",
  description: "Паспорт бойца за 60 секунд — имя, клуб, стиль.",
};

export default function RegisterFighterRoutePage() {
  return <FighterRegisterPage />;
}
