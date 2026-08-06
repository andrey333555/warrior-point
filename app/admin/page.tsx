import type { Metadata } from "next";
import AdminPage from "@/components/admin-page";

export const metadata: Metadata = {
  title: "Админ · Warrior Point",
  description: "Каркас админ-панели Round 23",
};

export default function AdminRoutePage() {
  return <AdminPage />;
}
