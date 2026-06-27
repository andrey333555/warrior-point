"use client";

import { useState, useEffect } from "react";

export function useFavorites(key: string) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) setItems(JSON.parse(stored));
  }, [key]);

  const toggle = (id: string) => {
    let updated;

    if (items.includes(id)) {
      updated = items.filter((i) => i !== id);
    } else {
      updated = [...items, id];
    }

    setItems(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  return { items, toggle };
}
