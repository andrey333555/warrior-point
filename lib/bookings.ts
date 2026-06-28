"use client";

import { useEffect, useState } from "react";

export type BookingType = "individual" | "group" | "split";
export type BookingStatus = "upcoming" | "completed";

export type Booking = {
  id: string;
  trainerName: string;
  gymName: string;
  date: string;
  time: string;
  type: BookingType;
  status: BookingStatus;
};

export const BOOKING_TYPE_LABEL: Record<BookingType, string> = {
  individual: "ИНДИВИД",
  group: "ГРУППА",
  split: "СПЛИТ",
};

const STORAGE_KEY = "wp.bookings.v1";

const SEED_HISTORY: Booking[] = [
  {
    id: "seed-1",
    trainerName: "Иван Дроздов",
    gymName: "Tiger Gym",
    date: "12 июн",
    time: "18:00",
    type: "split",
    status: "completed",
  },
  {
    id: "seed-2",
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

function load(): Booking[] {
  if (typeof window === "undefined") return [...SEED_HISTORY];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED_HISTORY];
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) ? parsed : [...SEED_HISTORY];
  } catch {
    return [...SEED_HISTORY];
  }
}

function persist(next: Booking[]) {
  bookings = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / serialization errors in mock
    }
  }
  listeners.forEach((l) => l(next));
}

export function getBookings(): Booking[] {
  if (bookings == null) bookings = load();
  return bookings;
}

export function addBooking(input: Omit<Booking, "id" | "status">): Booking {
  const booking: Booking = {
    ...input,
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: "upcoming",
  };
  persist([booking, ...getBookings()]);
  return booking;
}

export function useBookings(): Booking[] {
  const [state, setState] = useState<Booking[]>(() => getBookings());

  useEffect(() => {
    setState(getBookings());
    const listener: Listener = (next) => setState(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
