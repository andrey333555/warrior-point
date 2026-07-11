"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { HIDE_NAV_CLASS, useDonateUi } from "@/hooks/use-donate-ui";
import type { FeedCategory } from "@/components/feed/types";

type HubLink = {
  id: FeedCategory | "map";
  href: string;
  label: string;
  variant?: "map";
};

const LINKS: HubLink[] = [
  { id: "feed", href: "/", label: "Лента" },
  { id: "passport", href: "/?tab=passport", label: "Паспорт" },
  { id: "leaderboard", href: "/?tab=leaderboard", label: "Топ" },
  { id: "map", href: "/map", label: "Карты", variant: "map" },
];

const NAV_VISIBLE_ROUTES = new Set(["/", "/map", "/profile"]);

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "");
}

function isNavVisible(pathname: string): boolean {
  return NAV_VISIBLE_ROUTES.has(normalizePath(pathname));
}

function resolveActiveTab(pathname: string, tab: string | null): FeedCategory | "map" {
  if (normalizePath(pathname) === "/map") return "map";
  if (tab === "passport") return "passport";
  if (tab === "leaderboard") return "leaderboard";
  return "feed";
}

/**
 * Единая нижняя навигация хаба — без дублирования вкладок сверху и снизу.
 */
export function HubNav() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { isNavHidden } = useDonateUi();
  const [hidden, setHidden] = useState(false);

  const tab = searchParams.get("tab");
  const active = resolveActiveTab(pathname, tab);

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
      className="fixed bottom-4 left-1/2 z-[100] w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-full border border-white/[0.08] bg-black/80 px-1 py-1.5 backdrop-blur-xl shadow-[0_0_40px_-12px_rgba(34,211,238,0.45)] supports-[backdrop-filter]:bg-black/65"
      aria-label="Warrior Point hub"
    >
      <div className="grid grid-cols-4 items-center gap-0.5">
        {LINKS.map((item) => {
          const isActive = item.id === active;
          const isMap = item.variant === "map";

          const activeClass = isMap
            ? "relative rounded-full border border-emerald-800/70 bg-emerald-950/80 px-2 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300 shadow-[0_0_22px_-6px_rgba(6,78,59,0.8)] sm:text-[10px]"
            : "relative rounded-full border border-cyan-400/55 bg-cyan-500/[0.1] px-2 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-[0_0_22px_-6px_rgba(34,211,238,0.7)] sm:text-[10px]";

          const idleClass = isMap
            ? "rounded-full border border-transparent px-2 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-600 transition-colors hover:border-emerald-800/60 hover:bg-emerald-950/60 hover:text-emerald-400 sm:text-[10px]"
            : "rounded-full border border-transparent px-2 py-1.5 text-center font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:border-white/[0.08] hover:text-cyan-300/95 sm:text-[10px]";

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? activeClass : idleClass}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
