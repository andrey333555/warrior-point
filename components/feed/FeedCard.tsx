"use client";

import type { CSSProperties, ReactNode } from "react";

type FeedCardProps = {
  title: string;
  subtitle?: string;
  accent?: string;
  imageSrc?: string;
  imageAlt?: string;
  children?: ReactNode;
  onClick?: () => void;
};

function accentGlow(accent: string): string {
  const hex = accent.replace("#", "");
  if (hex.length !== 6) return "rgba(59,169,255,0.25)";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.25)`;
}

export function FeedCard({
  title,
  subtitle,
  accent = "#3BA9FF",
  imageSrc,
  imageAlt = "",
  children,
  onClick,
}: FeedCardProps) {
  const Tag = onClick ? "button" : "article";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="relative group w-full overflow-hidden rounded-2xl border border-white/[0.07] text-left transition-colors hover:border-white/[0.14]"
    >
      <div className="relative aspect-[16/10] w-full">
        {imageSrc ? (
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

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-[family-name:var(--font-geist-sans)] text-sm font-semibold text-white">
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <span
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: accent, boxShadow: `0 0 7px 1px ${accent}` }}
            />
          </div>
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </Tag>
  );
}
