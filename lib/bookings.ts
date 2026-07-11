"use client";

import { useEffect, useState } from "react";
import { trainers } from "@/lib/network";
import { clientInitial } from "@/lib/client-store";
import { saveData, loadData, STORAGE_KEYS } from "@/lib/storage";

export type BookingType = "individual" | "group" | "split";
export type BookingStatus = "upcoming" | "completed";

export type Booking = {
  id: string;
  trainerId: number;
  trainerName: string;
  gymName: string;
  date: string;
  time: string;
  type: BookingType;
  status: BookingStatus;
  tipped?: boolean;
};

export const BOOKING_TYPE_LABEL: Record<BookingType, string> = {
  individual: "ИНДИВИД",
  group: "ГРУППА",
  split: "СПЛИТ",
};

/** Маппинг названия тренировки тренера → тип брони для платежей. */
export function inferBookingType(trainingName: string): BookingType {
  const n = trainingName.toLowerCase();
  if (n.includes("групп") || n.includes("group")) return "group";
  if (n.includes("сплит") || n.includes("split") || n.includes("vip")) return "split";
  return "individual";
}

const STORAGE_KEY = STORAGE_KEYS.bookings;

const SEED_HISTORY: Booking[] = [
  {
    id: "seed-1",
    trainerId: 1,
    trainerName: "Иван Дроздов",
    gymName: "Tiger Gym",
    date: "12 июн",
    time: "18:00",
    type: "split",
    status: "completed",
  },
  {
    id: "seed-2",
    trainerId: 3,
    trainerName: "Мария Grapple",
    gymName: "Sparta Gym",
    date: "5 июн",
    time: "12:00",
    type: "individual",
    status: "completed",
  },
];

type Listener = (bookings: Booking[]) => void;

let bookings: Booking[] | null = null;
const listeners = new Set<Listener>();

function resolveTrainerId(trainerName: string): number {
  return trainers.find((t) => t.name === trainerName)?.id ?? 0;
}

function isBookingType(v: unknown): v is BookingType {
  return v === "individual" || v === "group" || v === "split";
}

function isBookingStatus(v: unknown): v is BookingStatus {
  return v === "upcoming" || v === "completed";
}

function isValidBooking(raw: unknown): raw is Booking {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Record<string, unknown>;
  return (
    typeof b.id === "string" &&
    typeof b.trainerName === "string" &&
    typeof b.gymName === "string" &&
    typeof b.date === "string" &&
    typeof b.time === "string" &&
    isBookingType(b.type) &&
    isBookingStatus(b.status)
  );
}

function normalizeBooking(raw: Booking): Booking {
  const trainerId =
    typeof raw.trainerId === "number" && raw.trainerId > 0
      ? raw.trainerId
      : resolveTrainerId(raw.trainerName);
  return { ...raw, trainerId };
}

function load(): Booking[] {
  try {
    const parsed = loadData<unknown>(STORAGE_KEY, null);
    if (!parsed || !Array.isArray(parsed)) return [...SEED_HISTORY];

    const normalized = parsed
      .filter(isValidBooking)
      .map((b) => normalizeBooking(b));

    if (normalized.length === 0) return [...SEED_HISTORY];

    const hadInvalid = parsed.length !== normalized.length;
    const hadMissingIds = parsed.some(
      (item) => isValidBooking(item) && !(item as Booking).trainerId,
    );
    if (hadInvalid || hadMissingIds) saveData(STORAGE_KEY, normalized);

    return normalized;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[bookings] load failed:", err);
    }
    return [...SEED_HISTORY];
  }
}

function persist(next: Booking[]) {
  try {
    bookings = next;
    saveData(STORAGE_KEY, next);
    listeners.forEach((l) => l(next));
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[bookings] persist failed:", err);
    }
  }
}

export function getBookings(): Booking[] {
  if (bookings == null) bookings = load();
  return bookings;
}

export function hasUpcomingBookingForTrainer(trainerId: number): boolean {
  return getBookings().some(
    (b) => b.status === "upcoming" && b.trainerId === trainerId,
  );
}

export function markTipped(bookingId: string): void {
  try {
    const next = getBookings().map((b) =>
      b.id === bookingId ? { ...b, tipped: true } : b,
    );
    persist(next);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[bookings] markTipped failed:", err);
    }
  }
}

export function completeBooking(bookingId: string): Booking | null {
  try {
    let found: Booking | null = null;
    const next = getBookings().map((b) => {
      if (b.id !== bookingId) return b;
      found = { ...b, status: "completed" as const };
      return found;
    });
    if (!found) return null;
    persist(next);
    return found;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[bookings] completeBooking failed:", err);
    }
    return null;
  }
}

export type AddBookingInput = Omit<Booking, "id" | "status">;

export function addBooking(input: AddBookingInput): Booking {
  const booking: Booking = {
    ...input,
    trainerId: input.trainerId || resolveTrainerId(input.trainerName),
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: "upcoming",
  };

  try {
    persist([booking, ...getBookings()]);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[bookings] addBooking failed:", err);
    }
    throw err;
  }

  return booking;
}

export function useBookings(): Booking[] {
  const [state, setState] = useState<Booking[]>(() =>
    clientInitial(() => getBookings(), []),
  );

  useEffect(() => {
    try {
      setState(getBookings());
    } catch {
      setState([]);
    }
    const listener: Listener = (next) => setState(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
