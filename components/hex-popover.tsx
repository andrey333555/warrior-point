"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

type Accent = "green" | "pink" | "cyan" | "gold";

const ACCENT: Record<
  Accent,
  { border: string; eyebrow: string; glowHex: string; halo: string }
> = {
  green: {
    border: "border-emerald-400/45",
    eyebrow: "text-emerald-300",
    glowHex: "rgba(52,211,153,0.55)",
    halo: "from-emerald-500/[0.12]",
  },
  pink: {
    border: "border-fuchsia-400/45",
    eyebrow: "text-fuchsia-300",
    glowHex: "rgba(232,121,249,0.55)",
    halo: "from-fuchsia-500/[0.14]",
  },
  cyan: {
    border: "border-cyan-400/45",
    eyebrow: "text-cyan-300",
    glowHex: "rgba(34,211,238,0.55)",
    halo: "from-cyan-500/[0.12]",
  },
  gold: {
    border: "border-amber-400/45",
    eyebrow: "text-amber-300",
    glowHex: "rgba(250,204,21,0.55)",
    halo: "from-amber-500/[0.12]",
  },
};

type HexPopoverProps = {
  id: string;
  accent: Accent;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Cyber-Loft popover anchored under a row of hex tiles. */
export function HexPopover({
  id,
  accent,
  eyebrow,
  title,
  onClose,
  children,
}: HexPopoverProps) {
  const tokens = ACCENT[accent];
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      const node = ref.current;

      if (!node || !(e.target instanceof Node)) return;
      if (node.contains(e.target)) return;

      // Ignore clicks on the hex buttons themselves (they handle their own toggle).
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("[data-hex-trigger]")
      ) {
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      id={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className={`relative overflow-hidden rounded-2xl border ${tokens.border} bg-black/85 p-[1px] backdrop-blur-md`}
      style={{ boxShadow: `0 0 60px -18px ${tokens.glowHex}` }}
    >
      <div
        className={`rounded-[calc(1rem-1px)] bg-gradient-to-br ${tokens.halo} via-transparent to-transparent p-5 sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={`font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.32em] ${tokens.eyebrow}`}
            >
              {eyebrow}
            </p>
            <h3
              id={`${id}-title`}
              className="mt-2 font-[family-name:var(--font-geist-mono)] text-base font-semibold uppercase tracking-[0.16em] text-white sm:text-lg"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-white/[0.08] bg-black/55 px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
          >
            esc
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </motion.div>
  );
}
