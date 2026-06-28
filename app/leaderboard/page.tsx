import type { Metadata } from "next";
import Leaderboard from "@/components/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard · Warrior Point",
  description: "Global ELO ranking · fighters and coaches",
};

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-black">
      <Leaderboard />
    </div>
  );
}
