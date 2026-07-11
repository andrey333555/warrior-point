"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { HIDE_NAV_CLASS, useDonateUi } from "@/hooks/use-donate-ui";

const LINKS = [
  { href: "/", label: "Passport", match: /^\/$/ },
  { href: "/leaderboard", label: "Leaderboard", match: /^\/leaderboard/ },
  { href: "/map", label: "Карты", match: /^\/map/, variant: "map" as const },
];

/** Nav only on main hubs. Hidden everywhere else, including:
 *  /session/complete · /booking/* · /trainer/* · /vip · /referral · /gym/* … */
const NAV_VISIBLE_ROUTES = new Set([
  "/",
  "/map",
  "/leaderboard",
  "/profile",
]);

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "");
}

function isNavVisible(pathname: string): boolean {
  return NAV_VISIBLE_ROUTES.has(normalizePath(pathname));
}

/**
 * Floating jeweller-grade pill — sits centred above the safe area so the
 * Warrior Passport composition reads as one continuous object from hex
 * cluster down to the rail.
 */
export function CyberNav() {
  const pathname = usePathname() ?? "";
  const { isNavHidden } = useDonateUi();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => {
      setHidden(document.body.classList.contains(HIDE_NAV_CLASS));
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  if (hidden || isNavHidden || !isNavVisible(pathname)) return null;

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-white/[0.08] bg-black/80 px-1.5 py-1.5 backdrop-blur-xl shadow-[0_0_40px_-12px_rgba(34,211,238,0.45)] supports-[backdrop-filter]:bg-black/65"
      aria-label="Warrior Point routes"
    >
      <div className="flex items-center gap-1">
        {LINKS.map((item) => {
          const active = item.match.test(pathname ?? "");
          const isMap = item.variant === "map";

          const activeClass = isMap
            ? "relative rounded-full border border-emerald-800/70 bg-emerald-950/80 px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.28em] text-emerald-300 shadow-[0_0_22px_-6px_rgba(6,78,59,0.8)]"
            : "relative rounded-full border border-cyan-400/55 bg-cyan-500/[0.1] px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.28em] text-cyan-200 shadow-[0_0_22px_-6px_rgba(34,211,238,0.7)]";

          const idleClass = isMap
            ? "rounded-full border border-emerald-950/80 bg-emerald-950/40 px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.28em] text-emerald-600 transition-colors hover:border-emerald-800/60 hover:bg-emerald-950/60 hover:text-emerald-400"
            : "rounded-full border border-transparent bg-transparent px-4 py-1.5 font-[family-name:var(--font-geist-mono)] text-[10.5px] font-semibold uppercase tracking-[0.28em] text-zinc-500 transition-colors hover:border-white/[0.08] hover:text-cyan-300/95";

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={active ? activeClass : idleClass}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
