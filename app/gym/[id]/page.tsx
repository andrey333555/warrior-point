import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GymPage from "@/components/gym-page";
import NetworkGymPage from "@/components/network-gym-page";
import { ACTIVE_GYMS, findGym as findMapGym } from "@/lib/gyms";
import { findGym as findNetworkGym, gyms as networkGyms, parseNetworkId } from "@/lib/network";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return [
    ...networkGyms.map((gym) => ({ id: String(gym.id) })),
    ...ACTIVE_GYMS.map((gym) => ({ id: gym.id })),
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const networkId = parseNetworkId(id);
  const networkGym = networkId != null ? findNetworkGym(networkId) : undefined;
  const mapGym = findMapGym(id);

  const gym = networkGym ?? mapGym;

  if (!gym) {
    return { title: "Зал не найден · Warrior Point" };
  }

  return {
    title: `${gym.name} · Warrior Point`,
    description: "verified gym · trainers · fighters",
  };
}

export default async function GymRoutePage({ params }: PageProps) {
  const { id } = await params;
  const networkId = parseNetworkId(id);

  if (networkId != null) {
    const gym = findNetworkGym(networkId);
    if (gym) {
      return (
        <div className="min-h-screen bg-black">
          <NetworkGymPage gym={gym} />
        </div>
      );
    }
  }

  const gym = findMapGym(id);

  if (!gym || gym.pending) {
    notFound();
  }

  return <GymPage gym={gym} />;
}
