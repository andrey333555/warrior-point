import type { GymEntry } from "@/lib/gyms";
import { findGymListing } from "@/lib/data";

export const DEFAULT_GYM_IMAGE = "/gym.jpg";

export function gymHeroProps(gym: GymEntry) {
  const listing = findGymListing(gym.id);

  if (listing) {
    return {
      name: listing.name,
      city: listing.city,
      rating: listing.rating,
      members: listing.members,
      image: listing.image,
      gymId: gym.id,
    };
  }

  const seed = Array.from(gym.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  return {
    name: gym.name,
    city: gym.city,
    rating: Math.round((4.5 + (seed % 6) * 0.08) * 10) / 10,
    members: 90 + (seed % 180),
    image: DEFAULT_GYM_IMAGE,
    gymId: gym.id,
  };
}
