"use client";

import { activateDevBypass } from "@/hooks/use-warrior-auth";

export function DemoButton() {
  return (
    <button
      type="button"
      onClick={activateDevBypass}
      className="
        group mt-4 w-full
        rounded-xl px-4 py-2.5
        bg-white/[0.03]
        border border-white/10
        text-sm text-white/50
        backdrop-blur-md
        transition
        hover:bg-white/[0.06]
        hover:text-white/80
      "
    >
      <div className="flex items-center justify-between">
        <span>Посмотреть демо</span>
        <span className="opacity-40 transition group-hover:translate-x-1">→</span>
      </div>
    </button>
  );
}
