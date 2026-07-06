"use client";

import { initAllStores } from "@/lib/store";

let didInit = false;

/**
 * Warms up all localStorage caches synchronously on the client
 * so hooks read persisted data on the first render after hydration.
 */
export function StoreInit() {
  if (typeof window !== "undefined" && !didInit) {
    didInit = true;
    try {
      initAllStores();
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[StoreInit] init failed:", err);
      }
    }
  }

  return null;
}
