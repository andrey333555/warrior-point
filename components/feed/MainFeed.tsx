"use client";

import type { ReactNode } from "react";

export function MainFeed({ children }: { children: ReactNode }) {
  return (
    <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {children}
    </main>
  );
}
