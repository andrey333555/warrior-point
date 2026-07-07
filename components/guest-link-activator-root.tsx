"use client";

import { Suspense } from "react";
import { GuestLinkActivator } from "@/components/guest-link-activator";

export function GuestLinkActivatorRoot() {
  return (
    <Suspense fallback={null}>
      <GuestLinkActivator />
    </Suspense>
  );
}
