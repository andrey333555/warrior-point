"use client";

import { useState, useEffect, useCallback } from "react";
import { loadData, saveData } from "@/lib/storage";

export function useFavorites(key: string, opts?: { max?: number }) {
  const [items, setItems] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const max = opts?.max;

  useEffect(() => {
    setItems(loadData<string[]>(key, []));
    setReady(true);
  }, [key]);

  const toggle = useCallback(
    (id: string) => {
      setItems((prev) => {
        let updated: string[];
        if (prev.includes(id)) {
          updated = prev.filter((item) => item !== id);
        } else if (max && prev.length >= max) {
          updated = [...prev.slice(1), id];
        } else {
          updated = [...prev, id];
        }
        saveData(key, updated);
        return updated;
      });
    },
    [key, max],
  );

  return { items, toggle, ready };
}
