import type { Metadata } from "next";
import VerifyPage from "@/components/verify-page";

export const metadata: Metadata = {
  title: "Верификация · Warrior Point",
};

export default function VerifyRoutePage() {
  return <VerifyPage />;
}
