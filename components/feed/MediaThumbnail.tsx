"use client";

import type { ReactNode } from "react";

type MediaThumbnailProps = {
  src: string;
  alt: string;
  aspectRatio?: string;
  rounded?: string;
  imageClassName?: string;
  glowColor?: string;
  className?: string;
  children?: ReactNode;
};

export function MediaThumbnail({
  src,
  alt,
  aspectRatio = "16/9",
  rounded = "rounded-2xl",
  imageClassName = "",
  glowColor = "rgba(201,168,76,0.25)",
  className = "",
  children,
}: MediaThumbnailProps) {
  return (
    <div
      className={`relative group overflow-hidden ${rounded} ${className}`}
      style={{ aspectRatio }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={`h-full w-full object-cover ${imageClassName}`} />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div className="absolute inset-0 bg-black/0 transition-all duration-300 ease-out group-hover:bg-black/40" />

      <div className="absolute inset-0 opacity-0 transition-all duration-300 ease-out group-hover:opacity-100">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${glowColor}, transparent 60%)`,
          }}
        />
      </div>

      {children}
    </div>
  );
}
