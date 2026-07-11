import { Suspense } from "react";
import type { Metadata } from "next";
import CheckInPage from "@/components/check-in-page";

export const metadata: Metadata = {
  title: "Check-in · Warrior Point",
  description: "Offline training fixation at the gym",
};

function CheckInContent({ trainerId }: { trainerId: string }) {
  return <CheckInPage trainerId={trainerId} />;
}

export default async function Page({
  params,
}: {
  params: Promise<{ trainerId: string }>;
}) {
  const { trainerId } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-sm text-zinc-500">
          Загрузка check-in…
        </div>
      }
    >
      <CheckInContent trainerId={trainerId} />
    </Suspense>
  );
}
