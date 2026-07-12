import type { Metadata } from "next";
import GymRegisterPage from "@/components/gym-register-page";

export const metadata: Metadata = {
  title: "Подключить зал · Warrior Point",
  description:
    "Заявка на верификацию зала и подключение к глобальной сети Warrior Network",
};

export default function GymRegisterRoutePage() {
  return <GymRegisterPage />;
}
