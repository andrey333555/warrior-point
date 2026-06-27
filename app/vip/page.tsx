import type { Metadata } from "next";
import VIPPage from "@/components/vip-page";

export const metadata: Metadata = {
  title: "Round 23 VIP · Warrior Point",
  description: "VIP-подписка · доступ к легендам · скидки на сплиты",
};

export default function VIPRoutePage() {
  return <VIPPage />;
}
