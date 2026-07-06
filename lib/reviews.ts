"use client";

import { useEffect, useState } from "react";
import { saveData, loadData, STORAGE_KEYS } from "@/lib/storage";
import { clientInitial } from "@/lib/client-store";

export type UserReview = {
  id: string;
  trainerId: number;
  trainerName: string;
  userName: string;
  text: string;
  rating: number;
  date: string;
};

const STORAGE_KEY = STORAGE_KEYS.reviews;

type Listener = (reviews: UserReview[]) => void;

let cache: UserReview[] | null = null;
const listeners = new Set<Listener>();

function load(): UserReview[] {
  return loadData<UserReview[]>(STORAGE_KEY, []);
}

function persist(next: UserReview[]): void {
  cache = next;
  saveData(STORAGE_KEY, next);
  listeners.forEach((l) => l(next));
}

export function getReviews(): UserReview[] {
  if (cache == null) cache = load();
  return cache;
}

export function addReview(input: Omit<UserReview, "id">): UserReview {
  const review: UserReview = {
    ...input,
    id: `rv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  persist([review, ...getReviews()]);
  return review;
}

export function useReviewsForTrainer(trainerId: number): {
  userReviews: UserReview[];
  add: (partial: { userName: string; text: string; rating: number; trainerName: string }) => void;
} {
  const [userReviews, setUserReviews] = useState<UserReview[]>(() =>
    clientInitial(
      () => getReviews().filter((r) => r.trainerId === trainerId),
      [],
    ),
  );

  useEffect(() => {
    setUserReviews(getReviews().filter((r) => r.trainerId === trainerId));
    const listener: Listener = (next) =>
      setUserReviews(next.filter((r) => r.trainerId === trainerId));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [trainerId]);

  const add = (partial: {
    userName: string;
    text: string;
    rating: number;
    trainerName: string;
  }) => {
    addReview({
      ...partial,
      trainerId,
      date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    });
  };

  return { userReviews, add };
}
