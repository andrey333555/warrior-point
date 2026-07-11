"use client";

import { Suspense } from "react";
import { HubNav } from "@/components/hub-nav";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

export function AppChrome() {
  return (
    <>
      <Suspense fallback={null}>
        <HubNav />
      </Suspense>
      <PwaInstallBanner />
    </>
  );
}
