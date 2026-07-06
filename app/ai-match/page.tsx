import type { Metadata } from "next";
import AiMatchPage from "@/components/ai-match-page";

export const metadata: Metadata = {
  title: "AI Подбор · Warrior Point",
  description: "Умный подбор тренера по целям, уровню и формату",
};

export default function AiMatchRoutePage() {
  return <AiMatchPage />;
}
