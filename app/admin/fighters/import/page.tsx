import type { Metadata } from "next";
import AdminFightersImport from "@/components/admin-fighters-import";

export const metadata: Metadata = {
  title: "Импорт бойцов · Админ · Warrior Point",
  description: "Массовое создание черновиков паспортов и инвайт-ссылок",
};

export default function AdminFightersImportPage() {
  return <AdminFightersImport />;
}
