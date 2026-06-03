/**
 * Warrior Point — City registry for map navigation.
 *
 * Used for:
 *  1. City selector in CyberMap → flyTo on selection
 *  2. Future expansion: adding gyms in new cities
 *
 * Coordinates: WGS-84 [lat, lng]. Zoom: Leaflet zoom level.
 */

export type CityEntry = {
  id: string;
  name: string;
  /** Two-letter region abbreviation for display. */
  region: string;
  lat: number;
  lng: number;
  /** Default zoom level when flying to this city. */
  zoom: number;
  /** True if the city already has gyms in the registry. */
  hasGyms?: boolean;
};

/** Ordered list: network cities first, expansion targets second. */
export const CITY_REGISTRY: readonly CityEntry[] = [
  // ── Active network ────────────────────────────────────────────────────────
  {
    id: "krasnodar",
    name: "Краснодар",
    region: "КК",
    lat: 45.0355,
    lng: 38.9753,
    zoom: 12,
    hasGyms: true,
  },
  {
    id: "anapa",
    name: "Анапа",
    region: "КК",
    lat: 44.8932,
    lng: 37.3187,
    zoom: 13,
    hasGyms: true,
  },
  {
    id: "novorossiysk",
    name: "Новороссийск",
    region: "КК",
    lat: 44.7233,
    lng: 37.7684,
    zoom: 13,
    hasGyms: true,
  },
  {
    id: "sevastopol",
    name: "Севастополь",
    region: "СЕВ",
    lat: 44.5764,
    lng: 33.4803,
    zoom: 13,
    hasGyms: true,
  },
  {
    id: "ust-labinsk",
    name: "Усть-Лабинск",
    region: "КК",
    lat: 45.2245,
    lng: 39.6871,
    zoom: 14,
    hasGyms: true,
  },
  {
    id: "armavir",
    name: "Армавир",
    region: "КК",
    lat: 44.9878,
    lng: 41.1267,
    zoom: 13,
    hasGyms: true,
  },
  {
    id: "severnaya",
    name: "ст. Северская",
    region: "КК",
    lat: 44.8535,
    lng: 38.8412,
    zoom: 14,
    hasGyms: true,
  },
  // ── Future expansion targets ──────────────────────────────────────────────
  {
    id: "sochi",
    name: "Сочи",
    region: "КК",
    lat: 43.5855,
    lng: 39.7232,
    zoom: 12,
    hasGyms: false,
  },
  {
    id: "rostov",
    name: "Ростов-на-Дону",
    region: "РО",
    lat: 47.2357,
    lng: 39.7015,
    zoom: 12,
    hasGyms: false,
  },
  {
    id: "moscow",
    name: "Москва",
    region: "МСК",
    lat: 55.7558,
    lng: 37.6173,
    zoom: 11,
    hasGyms: false,
  },
  {
    id: "spb",
    name: "Санкт-Петербург",
    region: "СПБ",
    lat: 59.9343,
    lng: 30.3351,
    zoom: 11,
    hasGyms: false,
  },
  {
    id: "novosibirsk",
    name: "Новосибирск",
    region: "НСК",
    lat: 54.9884,
    lng: 82.9357,
    zoom: 11,
    hasGyms: false,
  },
  {
    id: "ekaterinburg",
    name: "Екатеринбург",
    region: "ЕКБ",
    lat: 56.8389,
    lng: 60.6057,
    zoom: 11,
    hasGyms: false,
  },
  {
    id: "kazan",
    name: "Казань",
    region: "РТ",
    lat: 55.7887,
    lng: 49.1221,
    zoom: 12,
    hasGyms: false,
  },
  {
    id: "ufa",
    name: "Уфа",
    region: "БШК",
    lat: 54.7388,
    lng: 55.9721,
    zoom: 12,
    hasGyms: false,
  },
] as const;

/** Find a city by id. */
export function findCity(id: string): CityEntry | undefined {
  return CITY_REGISTRY.find((c) => c.id === id);
}

/** Find a city by exact name (case-sensitive). */
export function findCityByName(name: string): CityEntry | undefined {
  return CITY_REGISTRY.find((c) => c.name === name);
}
