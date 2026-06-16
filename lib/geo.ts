/**
 * Warrior Point — geolocation hub matching for the Cyber Map.
 *
 * Maps browser GPS coordinates to the nearest active network city
 * (CITY_REGISTRY entries with `hasGyms: true`).
 */

import { CITY_REGISTRY, findCityByName, type CityEntry } from "@/lib/cities";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in kilometres between two WGS-84 points. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Cities that currently have active gym markers on the map. */
export function activeHubCities(): CityEntry[] {
  return CITY_REGISTRY.filter((c) => c.hasGyms);
}

/**
 * Find the nearest network hub within `maxRadiusKm`.
 * Returns `null` when no hub is close enough.
 */
export function nearestHubCity(
  lat: number,
  lng: number,
  maxRadiusKm = 45,
): CityEntry | null {
  let best: CityEntry | null = null;
  let bestDist = Infinity;

  for (const city of activeHubCities()) {
    const d = distanceKm(lat, lng, city.lat, city.lng);
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }

  return best && bestDist <= maxRadiusKm ? best : null;
}

/** Default hub when GPS is denied or no match is found. */
export function defaultHubCity(): CityEntry {
  return findCityByName("Краснодар") ?? activeHubCities()[0];
}

export type GeoResolveResult = {
  city: CityEntry;
  /** True when GPS matched a hub within radius (not a fallback). */
  matched: boolean;
};

/**
 * Resolve user coordinates to a hub city.
 * Falls back to Краснодар when no hub is within range.
 */
export function resolveHubFromCoords(lat: number, lng: number): GeoResolveResult {
  const hub = nearestHubCity(lat, lng);
  if (hub) return { city: hub, matched: true };
  return { city: defaultHubCity(), matched: false };
}

/** Promise wrapper around `navigator.geolocation.getCurrentPosition`. */
export function getBrowserPosition(
  opts: PositionOptions = { timeout: 12000, enableHighAccuracy: true, maximumAge: 60_000 },
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}
