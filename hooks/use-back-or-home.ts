"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Возврат назад с безопасным fallback.
 * При прямом заходе (нет истории) уводит на переданный путь, а не «в никуда».
 */
export function useBackOrHome(fallback = "/") {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }, [router, fallback]);
}
