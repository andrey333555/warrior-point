"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, IdCard, Map, Trophy } from "lucide-react";
import { HIDE_NAV_CLASS, useDonateUi } from "@/hooks/use-donate-ui";
import {
  isGuestModeActive,
  useWarriorAuth,
} from "@/hooks/use-warrior-auth";
import type { FeedCategory } from "@/components/feed/types";

type HubId = FeedCategory | "map";

type HubLink = {
  id: HubId;
  href: string;
  label: string;
  Icon: typeof Home;
};

const LINKS: HubLink[] = [
  { id: "feed", href: "/?tab=feed", label: "Главная", Icon: Home },
  { id: "passport", href: "/?tab=passport", label: "Паспорт", Icon: IdCard },
  { id: "leaderboard", href: "/?tab=leaderboard", label: "Топ", Icon: Trophy },
  { id: "map", href: "/map", label: "Карты", Icon: Map },
];

const PILL_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const NAV_VISIBLE_ROUTES = new Set(["/", "/map", "/profile", "/settings"]);

const GUEST_EVENTS = [
  "wp:guest-mode",
  "wp:guest-mode-off",
  "wp:dev-bypass",
  "wp:dev-bypass-off",
  "storage",
] as const;

function subscribeGuestMode(onChange: () => void): () => void {
  for (const name of GUEST_EVENTS) window.addEventListener(name, onChange);
  return () => {
    for (const name of GUEST_EVENTS) window.removeEventListener(name, onChange);
  };
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/$/, "");
}

function isNavVisible(pathname: string): boolean {
  return NAV_VISIBLE_ROUTES.has(normalizePath(pathname));
}

function resolveActiveTab(pathname: string, tab: string | null): HubId {
  if (normalizePath(pathname) === "/map") return "map";
  if (tab === "passport") return "passport";
  if (tab === "leaderboard") return "leaderboard";
  return "feed";
}

/**
 * Плавающая капсула хаба. Только после входа / гостя — на экране логина нет.
 */
export function HubNav() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isNavHidden } = useDonateUi();
  const auth = useWarriorAuth();
  const storedGuest = useSyncExternalStore(
    subscribeGuestMode,
    isGuestModeActive,
    () => false,
  );
  const [hidden, setHidden] = useState(false);
  const [animatePill, setAnimatePill] = useState(false);

  const tab = searchParams.get("tab");
  const active = resolveActiveTab(pathname, tab);
  const activeIndex = Math.max(
    0,
    LINKS.findIndex((item) => item.id === active),
  );
  const signedIn = auth.status === "authenticated" || storedGuest;

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

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setAnimatePill(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (!signedIn || hidden || isNavHidden || !isNavVisible(pathname)) return null;

  return (
    <nav
      className="pointer-events-none fixed left-1/2 z-[100] -translate-x-1/2"
      style={{
        bottom: 20,
        marginBottom: 20,
        width: "min(320px, calc(100% - 40px))",
      }}
      aria-label="Warrior Point hub"
    >
      <div
        className="pointer-events-auto p-1"
        style={{
          background: "#1a1a1a",
          borderRadius: 40,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="relative grid grid-cols-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/4"
            style={{
              background: "#D4A847",
              borderRadius: 32,
              transform: `translateX(${activeIndex * 100}%)`,
              transition: animatePill
                ? `transform 520ms ${PILL_EASE}`
                : "none",
            }}
          />

          {LINKS.map((item) => {
            const isActive = item.id === active;
            const Icon = item.Icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                replace
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className="relative z-10 flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-1 py-1.5"
                style={{
                  color: isActive ? "#0A0A0A" : "#8a8a8a",
                }}
                onClick={(event) => {
                  if (item.id === active) {
                    event.preventDefault();
                    return;
                  }
                  if (normalizePath(pathname) === "/" && item.id !== "map") {
                    event.preventDefault();
                    router.replace(item.href);
                  }
                }}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.4 : 1.75}
                  color="currentColor"
                  aria-hidden
                />
                <span
                  className="font-[family-name:var(--font-geist-mono)] text-[9px] font-semibold leading-none tracking-[0.04em] sm:text-[10px]"
                  style={{ color: "inherit" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
