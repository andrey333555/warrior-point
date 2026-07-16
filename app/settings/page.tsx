import type { Metadata } from "next";
import SettingsPage from "@/components/settings-page";

export const metadata: Metadata = {
  title: "Настройки · Warrior Point",
  description: "Тема приложения · светлая, тёмная, гибрид, авто",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
