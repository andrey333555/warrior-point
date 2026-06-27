"use client";

import type { CSSProperties, ReactNode } from "react";
import { accentGlow } from "@/components/feed/utils";

type MediaSurfaceProps = {
  imageSrc?: string;
  imageAlt?: string;
  accent?: string;
  aspectClass?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function MediaSurface({
  imageSrc,
  imageAlt = "",
  accent = "#3BA9FF",
  aspectClass = "aspect-[16/10]",
  children,
  className = "",
  onClick,
}: MediaSurfaceProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`relative group w-full overflow-hidden rounded-2xl border border-white/[0.07] text-left transition-colors hover:border-white/[0.14] ${className}`}
    >
      <div className={`relative w-full ${aspectClass}`}>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
            style={
              {
                backgroundImage: `linear-gradient(145deg, ${accent}18 0%, transparent 45%), linear-gradient(to bottom right, #0a0a12, #050508)`,
              } as CSSProperties
            }
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${accentGlow(accent)}, transparent 60%)`,
            }}
          />
        </div>

        {children}
      </div>
    </Tag>
  );
}
