"use client";

import type { ReactNode } from "react";

export function MainFeed({ children }: { children: ReactNode }) {
  return (
    <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
      {children}
    </main>
  );
}
