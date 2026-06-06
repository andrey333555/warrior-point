"use client";

/**
 * LotusIcon — Click-to-bloom icon with spring-physics petal cards.
 *
 * Closed state: central icon with subtle neon glow ring.
 * Open  state: icon pulses, and 2-4 info "petals" fan radially outward
 *              with staggered spring entrance animation.
 *
 * Usage:
 *   <LotusIcon accent="#facc15" name="ACA" petals={[...]} closeOnOutside>
 *     <AcaLogo size={26} color="#facc15" />
 *   </LotusIcon>
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LotusPetal = {
  /** Short Ru label (e.g. "Статус") */
  label: string;
  /** Value text (e.g. "Топ-боец") */
  value: string;
};

type LotusIconProps = {
  children: React.ReactNode;
  /** Display name shown in the closed tooltip */
  name: string;
  /** Neon accent hex colour */
  accent: string;
  /** Info petals that fan out on open */
  petals: LotusPetal[];
  /** Icon container diameter in px (default 36) */
  size?: number;
  /** Radial distance petals travel from centre (default 58) */
  radius?: number;
  /** Starting angle offset in degrees (default -90 = 12 o'clock first) */
  angleOffset?: number;
  /** If true, clicking outside the component closes it */
  closeOnOutside?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Distribute petals evenly across a semicircle below the icon (better UX). */
function petalAngles(n: number, offsetDeg: number): number[] {
  if (n === 1) return [(offsetDeg + 90) * (Math.PI / 180)];
  // Spread evenly across 270° arc starting from offsetDeg
  const span = 270;
  const start = offsetDeg - span / 2;
  return Array.from({ length: n }, (_, i) => {
    const deg = start + (i / (n - 1)) * span;
    return deg * (Math.PI / 180);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LotusIcon({
  children,
  name,
  accent,
  petals,
  size = 36,
  radius = 58,
  angleOffset = 90,
  closeOnOutside = true,
}: LotusIconProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Close when clicking outside
  useEffect(() => {
    if (!closeOnOutside || !open) return undefined;

    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [open, closeOnOutside]);

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const angles = petalAngles(petals.length, angleOffset);

  return (
    <div
      ref={wrapRef}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* ── Central icon button ──────────────────────────────────────── */}
      <motion.button
        type="button"
        id={`lotus-trigger-${uid}`}
        aria-expanded={open}
        aria-label={open ? `Закрыть ${name}` : `Показать ${name}`}
        onClick={toggle}
        whileTap={{ scale: 0.9 }}
        className="relative z-10 flex items-center justify-center rounded-full focus:outline-none"
        style={{ width: size, height: size }}
        animate={
          open
            ? {
                boxShadow: [
                  `0 0 12px -4px ${accent}80`,
                  `0 0 22px -2px ${accent}`,
                  `0 0 12px -4px ${accent}80`,
                ],
              }
            : { boxShadow: `0 0 8px -5px ${accent}60` }
        }
        transition={
          open
            ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
      >
        {/* Glow ring */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border"
          animate={
            open
              ? { opacity: [0.3, 0.8, 0.3], scale: [1, 1.15, 1] }
              : { opacity: 0.25, scale: 1 }
          }
          transition={
            open
              ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
          }
          style={{ borderColor: `${accent}70` }}
        />

        {/* Background fill */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: `${accent}${open ? "18" : "0e"}` }}
        />

        {/* Icon */}
        {children}
      </motion.button>

      {/* ── Petal cards ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {open &&
          petals.map((petal, i) => {
            const rad = angles[i] ?? 0;
            const tx = Math.cos(rad) * radius;
            const ty = Math.sin(rad) * radius;

            return (
              <motion.div
                key={`${uid}-petal-${i}`}
                aria-hidden
                initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                animate={{ opacity: 1, scale: 1, x: tx, y: ty }}
                exit={{ opacity: 0, scale: 0.4, x: tx * 0.4, y: ty * 0.4 }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 26,
                  delay: i * 0.07,
                }}
                className="absolute z-20 flex min-w-[76px] flex-col rounded-xl border px-2 py-1.5 backdrop-blur-sm"
                style={{
                  transformOrigin: "center center",
                  left: "50%",
                  top: "50%",
                  // Framer motion adds x/y on top of the translate
                  transform: "translate(-50%, -50%)",
                  borderColor: `${accent}40`,
                  background: `linear-gradient(135deg, ${accent}14, rgba(0,0,0,0.88))`,
                  boxShadow: `0 0 18px -6px ${accent}70, inset 0 1px 0 ${accent}20`,
                  pointerEvents: "none",
                }}
              >
                <span
                  className="font-[family-name:var(--font-geist-mono)] text-[7.5px] font-semibold uppercase tracking-[0.3em]"
                  style={{ color: accent, opacity: 0.8 }}
                >
                  {petal.label}
                </span>
                <span className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-zinc-100">
                  {petal.value}
                </span>
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

type PromotionItem = {
  logo: React.ReactNode;
  name: string;
  accent: string;
  petals: LotusPetal[];
};

/**
 * PromotionsRow — grid of LotusIcons for the Promotions pod.
 *
 * Layout rules:
 *   ≤ 3 items → single row
 *   4 items   → 2 × 2 grid
 *   5+ items  → flex-wrap, max 3 per row
 */
export function PromotionsRow({ items }: { items: PromotionItem[] }) {
  const is2x2 = items.length === 4;
  const iconSize = items.length > 3 ? 26 : 30;
  const gap = items.length > 3 ? 6 : 10;
  const petalRadius = items.length > 3 ? 46 : 52;

  return (
    <div
      className="flex flex-wrap items-center justify-center"
      style={{
        gap,
        maxWidth: is2x2 ? iconSize * 2 + gap : "none",
      }}
    >
      {items.map((item) => (
        <LotusIcon
          key={item.name}
          name={item.name}
          accent={item.accent}
          petals={item.petals}
          size={iconSize}
          radius={petalRadius}
          angleOffset={90}
          closeOnOutside
        >
          {item.logo}
        </LotusIcon>
      ))}
    </div>
  );
}
