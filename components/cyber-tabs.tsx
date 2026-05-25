"use client";

import { motion } from "framer-motion";

export type CyberTabDef<Id extends string> = {
  id: Id;
  label: string;
  hint?: string;
};

type CyberTabsProps<Id extends string> = {
  tabs: ReadonlyArray<CyberTabDef<Id>>;
  active: Id;
  onChange: (id: Id) => void;
  layoutId?: string;
};

export function CyberTabs<Id extends string>({
  tabs,
  active,
  onChange,
  layoutId = "cyber-tab-active",
}: CyberTabsProps<Id>) {
  return (
    <div
      role="tablist"
      aria-label="Passport sections"
      className="flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-white/[0.08] bg-zinc-950/65 p-1 backdrop-blur-md sm:gap-2"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors sm:px-4 sm:py-3 sm:text-xs ${
              isActive ? "text-cyan-100" : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {isActive ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl border border-cyan-400/55 bg-cyan-500/[0.1]"
                style={{
                  boxShadow:
                    "0 0 26px -8px rgba(34,211,238,0.6), inset 0 0 35px rgba(34,211,238,0.08)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
