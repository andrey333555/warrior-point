"use client";

import { useEffect, useState } from "react";
import { saveData, loadData, STORAGE_KEYS } from "@/lib/storage";
import { clientInitial } from "@/lib/client-store";

const STORAGE_KEY = STORAGE_KEYS.subscriptions;

type Listener = (ids: number[]) => void;

let cache: number[] | null = null;
const listeners = new Set<Listener>();

function load(): number[] {
  return loadData<number[]>(STORAGE_KEY, []);
}

function persist(next: number[]): void {
  cache = next;
  saveData(STORAGE_KEY, next);
  listeners.forEach((l) => l(next));
}

export function getSubscriptions(): number[] {
  if (cache == null) cache = load();
  return cache;
}

export function isSubscribed(trainerId: number): boolean {
  return getSubscriptions().includes(trainerId);
}

export function subscribe(trainerId: number): void {
  if (isSubscribed(trainerId)) return;
  persist([...getSubscriptions(), trainerId]);
}

export function useSubscription(trainerId: number): {
  subscribed: boolean;
  subscribe: () => void;
} {
  const [subscribed, setSubscribed] = useState(() =>
    clientInitial(() => isSubscribed(trainerId), false),
  );

  useEffect(() => {
    setSubscribed(isSubscribed(trainerId));
    const listener: Listener = (ids) => setSubscribed(ids.includes(trainerId));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [trainerId]);

  return {
    subscribed,
    subscribe: () => subscribe(trainerId),
  };
}
