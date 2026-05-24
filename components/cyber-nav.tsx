"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Passport", match: /^\/$/ },
  { href: "/leaderboard", label: "Leaderboard", match: /^\/leaderboard/ },
];

export function CyberNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-cyan-500/20 bg-black/92 px-4 py-3 backdrop-blur-lg supports-[backdrop-filter]:bg-black/82"
      aria-label="Warrior Point routes"
    >
      <div className="mx-auto flex max-w-lg justify-center gap-2 sm:max-w-2xl sm:gap-4">
        {LINKS.map((item) => {
          const active = item.match.test(pathname ?? "");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "font-[family-name:var(--font-geist-mono)] rounded-lg border border-cyan-400/60 bg-cyan-500/[0.12] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200 shadow-[0_0_24px_-4px_rgba(34,211,238,0.45)]"
                  : "font-[family-name:var(--font-geist-mono)] rounded-lg border border-white/[0.08] bg-zinc-950/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400 transition-colors hover:border-cyan-400/35 hover:text-cyan-300/95"
              }
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
