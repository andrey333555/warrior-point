import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GymPage from "@/components/gym-page";
import { ACTIVE_GYMS, findGym } from "@/lib/gyms";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return ACTIVE_GYMS.map((gym) => ({ id: gym.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const gym = findGym(id);

  if (!gym) {
    return { title: "Зал не найден · Warrior Point" };
  }

  return {
    title: `${gym.name} · Warrior Point`,
    description: `${gym.city} · ${gym.specializations.join(" · ")} · сплиты и запись`,
  };
}

export default async function GymRoutePage({ params }: PageProps) {
  const { id } = await params;
  const gym = findGym(id);

  if (!gym || gym.pending) {
    notFound();
  }

  return <GymPage gym={gym} />;
}
