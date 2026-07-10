import type { Metadata } from "next";
import ReferralPage from "@/components/referral-page";

export const metadata: Metadata = {
  title: "Рефералы · Warrior Point",
  description: "Приглашай друзей · получай бонусы · расти по тирам",
};

export default function ReferralRoutePage() {
  return <ReferralPage />;
}
