import { loadData, saveData } from "@/lib/storage";

export const GYM_CATEGORIES = [
  "MMA",
  "Бокс",
  "BJJ",
  "Борьба",
  "Кикбоксинг",
  "Тайский бокс",
  "Кроссфит",
  "Функционал",
] as const;

export type GymRegistrationForm = {
  name: string;
  city: string;
  address: string;
  phone: string;
  description: string;
  categories: string[];
  photos: string[];
  lat: number | null;
  lng: number | null;
  ownerName: string;
  ownerPhone: string;
  schedule: string;
  priceFrom: number;
  website?: string;
  telegram?: string;
  instagram?: string;
};

export type GymRegistration = GymRegistrationForm & {
  id: string;
  status: "submitted";
  createdAt: string;
};

const STORAGE_KEY = "wp.gym.registrations.v2";

export function loadGymRegistrations(): GymRegistration[] {
  return loadData<GymRegistration[]>(STORAGE_KEY, []);
}

export function submitGymRegistration(
  input: GymRegistrationForm,
): GymRegistration {
  const entry: GymRegistration = {
    ...input,
    id: `GYM-${Date.now().toString(36).toUpperCase()}`,
    status: "submitted",
    createdAt: new Date().toISOString(),
  };

  const all = loadGymRegistrations();
  saveData(STORAGE_KEY, [entry, ...all].slice(0, 20));
  return entry;
}
