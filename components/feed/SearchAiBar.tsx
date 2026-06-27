"use client";

import { useState } from "react";
import { AiAssistantButton } from "@/components/ai-assistant-overlay";

type SearchAiBarProps = {
  accent?: string;
  onSearch?: (query: string) => void;
};

export function SearchAiBar({ accent = "#00F0FF", onSearch }: SearchAiBarProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="relative z-20 shrink-0 border-b border-white/[0.06] bg-black/30 px-3 py-2.5 backdrop-blur-md sm:px-5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            aria-hidden
          >
            <svg viewBox="0 0 20 20" width={14} height={14} fill="none">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder="Поиск бойцов, залов, лиг…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-cyan-400/30"
          />
        </div>
        <AiAssistantButton accent={accent} className="shrink-0" />
      </div>
    </div>
  );
}
