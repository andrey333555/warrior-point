"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { activateGuestMode, isGuestModeActive } from "@/hooks/use-warrior-auth";

/** Reads ?guest=1 or ?demo=1 from share links and enters guest mode. */
export function GuestLinkActivator() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const guest =
      searchParams.get("guest") === "1" ||
      searchParams.get("demo") === "1" ||
      searchParams.get("preview") === "1";

    if (!guest) return;
    if (isGuestModeActive()) return;

    activateGuestMode();
    // Keep ?guest=1 in the URL so refresh / Soft nav never fall back to AuthGate
    // while auth is still hydrating. Share links stay shareable.
  }, [searchParams]);

  return null;
}
