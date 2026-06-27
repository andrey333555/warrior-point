"use client";

import { useEffect, useRef, useState } from "react";

type PassportHeroProps = {
  imageSrc?: string;
  glowColor?: string;
  heightClass?: string;
  parallaxFactor?: number;
};

function accentGlow(accent: string, alpha = 0.25): string {
  const hex = accent.replace("#", "");
  if (hex.length !== 6) return `rgba(168,85,247,${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function PassportHero({
  imageSrc = "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=900&q=80",
  glowColor = "#a855f7",
  heightClass = "h-[200px]",
  parallaxFactor = 0.3,
}: PassportHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scrollParent = findScrollParent(root);
    if (!scrollParent) return;

    const onScroll = () => setScrollY(scrollParent.scrollTop);
    onScroll();
    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={rootRef} className={`relative overflow-hidden ${heightClass}`}>
      <div
        className="absolute inset-x-0 top-0 h-[130%] will-change-transform"
        style={{ transform: `translateY(${scrollY * parallaxFactor}px)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 20%, ${accentGlow(glowColor)}, transparent 60%)`,
          }}
        />

        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
      </div>
    </div>
  );
}

/** @deprecated Use PassportHero */
export const FighterHeroBanner = PassportHero;
