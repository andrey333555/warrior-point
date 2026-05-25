"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Passport", match: /^\/$/ },
  { href: "/leaderboard", label: "Leaderboard", match: /^\/leaderboard/ },
];

/**
 * Floating jeweller-grade pill — sits centred above the safe area so the
 * Warrior Passport composition reads as one continuous object from hex
 * cluster down to the rail.
 */
export function CyberNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-white/[0.08] bg-black/80 px-1.5 py-1.5 backdrop-blur-xl shadow-[0_0_40px_-12px_rgba(34,211,238,0.45)] supports-[backdrop-filter]:bg-black/65"
      aria-label="Warrior Point routes"
    >
      <div className="flex items-center gap-1">
        {LINKS.map((item) => {
          const active = item.match.test(pathname ?? "");

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "relative rounded-full border border-cyan-400/55 bg-cyan-500/[0.1] px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.28em] text-cyan-200 shadow-[0_0_22px_-6px_rgba(34,211,238,0.7)]"
                  : "rounded-full border border-transparent bg-transparent px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.28em] text-zinc-500 transition-colors hover:border-white/[0.08] hover:text-cyan-300/95"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
