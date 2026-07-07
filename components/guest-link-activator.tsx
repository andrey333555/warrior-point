"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { activateGuestMode } from "@/hooks/use-warrior-auth";

/** Reads ?guest=1 or ?demo=1 from share links and enters guest mode. */
export function GuestLinkActivator() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const guest =
      searchParams.get("guest") === "1" ||
      searchParams.get("demo") === "1" ||
      searchParams.get("preview") === "1";

    if (!guest) return;

    activateGuestMode();

    const url = new URL(window.location.href);
    url.searchParams.delete("guest");
    url.searchParams.delete("demo");
    url.searchParams.delete("preview");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next || "/");
  }, [searchParams]);

  return null;
}
