"use client";

import { useEffect } from "react";
import { applyThemeToDocument, getThemePreference, subscribeTheme } from "@/lib/theme";

/**
 * Applies saved theme (dark / light / hybrid / auto) to <html data-theme>.
 * Mount once in the root layout.
 */
export function ThemeProvider() {
  useEffect(() => {
    applyThemeToDocument(getThemePreference());
    return subscribeTheme((pref) => applyThemeToDocument(pref));
  }, []);

  return null;
}
