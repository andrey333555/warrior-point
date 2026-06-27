import type { Metadata } from "next";
import LevelsDemo from "@/components/levels-demo";

export const metadata: Metadata = {
  title: "Round 23 · Levels Demo",
  description: "Демо системы 23 раундов Warrior Point",
};

export default function LevelsPage() {
  return <LevelsDemo />;
}
