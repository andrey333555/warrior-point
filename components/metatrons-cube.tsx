"use client";

/**
 * MetatronsCube — canonical 13-node Metatron's Cube as a background matrix.
 *
 * Layers:
 *   z-0  SVG geometry (78 lines · 13 spheres) — faint, may rotate on tap
 *   z-10 Fixed horizontal UI — Combat Score (top) · face content (centre)
 *
 * Faces (tap outside media to cycle):
 *   0 MEDIA   — compact VideoPlayer glass card (default)
 *   1 ETHER   — horizontal AI analytics
 *   2 HIGHLIGHT — alternate bout card
 */

import { useCallback, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VideoPlayer } from "@/components/video-player";

export type MetatronRole = "fighter" | "coach" | "athlete";
export type MetatronFace = 0 | 1 | 2;

const ROLE_PALETTE: Record<MetatronRole, string> = {
  fighter: "#d946ef",
  athlete: "#00F0FF",
  coach: "#facc15",
};

const AI_ETHER =
  "Прессинг + клинч-контроль. Сильные раунды 1–2, добивание в партере. Слабая зона — длинная дистанция.";

const HIGHLIGHTS = [
  { tag: "RCC", label: "SUB · R3" },
  { tag: "ACA", label: "KO · R2" },
  { tag: "FN", label: "DEC · UD" },
];

const CX = 100;
const CY = 100;
const R_INNER = 32;
const R_OUTER = R_INNER * Math.sqrt(3);

type Point = readonly [number, number];

function hexRing(cx: number, cy: number, radius: number): Point[] {
  return Array.from({ length: 6 }, (_, i) => {
    const rad = ((i * 60 - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)] as const;
  });
}

function buildMetatron13(): Point[] {
  return [[CX, CY], ...hexRing(CX, CY, R_INNER), ...hexRing(CX, CY, R_OUTER)];
}

function buildCompleteGraph(nodes: Point[]) {
  const segs: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      segs.push({
        x1: nodes[i][0],
        y1: nodes[i][1],
        x2: nodes[j][0],
        y2: nodes[j][1],
        key: `${i}-${j}`,
      });
    }
  }
  return segs;
}

function sphereStroke(index: number, role: MetatronRole): string {
  const base = ROLE_PALETTE[role];
  if (role === "fighter") {
    return index === 0 ? "#e879f9" : index <= 6 ? (index % 2 === 0 ? "#e879f9" : base) : base;
  }
  return base;
}

type MetatronsCubeProps = {
  role?: MetatronRole;
  combatScore?: number;
  size?: number;
  className?: string;
  videoSrc?: string;
  posterInitials?: string;
  posterUrl?: string;
};

export function MetatronsCube({
  role = "fighter",
  combatScore = 92.4,
  size = 180,
  className = "",
  videoSrc,
  posterInitials = "ББ",
  posterUrl,
}: MetatronsCubeProps) {
  const uid = useId().replace(/:/g, "");
  const [face, setFace] = useState<MetatronFace>(0);
  const [bgRotation, setBgRotation] = useState(0);
  const [highlightIdx, setHighlightIdx] = useState(0);

  const accent = ROLE_PALETTE[role];
  const nodes = useMemo(() => buildMetatron13(), []);
  const lines = useMemo(() => buildCompleteGraph(nodes), [nodes]);
  const highlight = HIGHLIGHTS[highlightIdx];

  const cycleFace = useCallback(() => {
    setFace((f) => ((f + 1) % 3) as MetatronFace);
    setBgRotation((r) => r + 60);
    setHighlightIdx((h) => (h + 1) % HIGHLIGHTS.length);
  }, []);

  return (
    <div
      className={`relative mx-auto ${className}`}
      style={{ width: size, height: size }}
    >
      {/* ── z-0 · Sacred geometry background (rotates independently) ───── */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        animate={{ rotate: bgRotation }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        style={{ transformOrigin: "center center" }}
      >
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          className="h-full w-full overflow-visible"
          style={{ color: accent }}
          aria-hidden
        >
          <defs>
            <filter id={`meta-glow-${uid}`}>
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g opacity={0.2}>
            {lines.map((ln) => (
              <motion.line
                key={ln.key}
                x1={ln.x1}
                y1={ln.y1}
                x2={ln.x2}
                y2={ln.y2}
                stroke="currentColor"
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
                animate={{ opacity: [0.14, 0.22, 0.14] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: ((ln.x1 + ln.y1) % 40) * 0.015,
                }}
              />
            ))}
          </g>

          <polygon
            points={nodes.slice(1, 7).map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
            opacity={0.12}
          />
          <polygon
            points={nodes.slice(7, 13).map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
            opacity={0.1}
          />

          {nodes.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              className="fill-zinc-950"
              stroke={sphereStroke(i, role)}
              strokeWidth={1}
              filter={`url(#meta-glow-${uid})`}
              opacity={0.75}
            />
          ))}
        </svg>
      </motion.div>

      {/* ── Tap-to-cycle overlay (behind interactive media) ───────────── */}
      <button
        type="button"
        aria-label="Сменить слой Куба Метатрона"
        onClick={cycleFace}
        className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent"
      />

      {/* ── z-10 · Fixed horizontal UI (never rotated) ──────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        {/* Combat Score — pinned top */}
        <div className="shrink-0 pt-1 text-center">
          <p className="font-[family-name:var(--font-geist-mono)] text-[6.5px] font-semibold uppercase tracking-[0.38em] text-neutral-500">
            Combat Score
          </p>
          <p
            className="font-[family-name:var(--font-jetbrains-mono)] text-[1.15rem] font-extrabold leading-none text-white"
            style={{ textShadow: `0 0 16px ${accent}80` }}
          >
            {combatScore.toFixed(1)}
          </p>
        </div>

        {/* Centre face content */}
        <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-1">
          <AnimatePresence mode="wait">
            {face === 0 ? (
              <motion.div
                key="media"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto w-[78%] max-w-[140px]"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div
                  className="overflow-hidden rounded-xl border bg-neutral-900/60 backdrop-blur-md"
                  style={{ borderColor: `${accent}44`, boxShadow: `0 0 20px -8px ${accent}55` }}
                >
                  <div className="flex items-center justify-center py-1">
                    <VideoPlayer
                      src={videoSrc}
                      posterInitials={posterInitials}
                      posterUrl={posterUrl}
                      accent={accent}
                      size={52}
                      caption={`Highlight · ${highlight.tag}`}
                    />
                  </div>
                  <div className="border-t border-white/[0.06] px-2.5 py-1.5 text-center">
                    <p
                      className="font-[family-name:var(--font-jetbrains-mono)] text-[7px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: accent }}
                    >
                      Highlight · {highlight.tag}
                    </p>
                    <p className="font-[family-name:var(--font-geist-sans)] text-[10px] font-semibold text-white">
                      {highlight.label}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : face === 1 ? (
              <motion.div
                key="ether"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto max-w-[88%] rounded-xl border border-white/[0.08] bg-neutral-900/70 px-3 py-2.5 text-center backdrop-blur-md"
                style={{ boxShadow: `0 0 18px -10px ${accent}66` }}
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  className="font-[family-name:var(--font-jetbrains-mono)] text-[8px] font-bold uppercase tracking-[0.28em]"
                  style={{ color: accent }}
                >
                  Эфир · ИИ
                </p>
                <p className="mt-1.5 font-[family-name:var(--font-geist-sans)] text-[9px] leading-relaxed text-neutral-300">
                  {AI_ETHER}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="alt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-auto rounded-xl border border-white/[0.08] bg-neutral-900/65 px-3 py-2.5 text-center backdrop-blur-md"
              >
                <p className="font-[family-name:var(--font-jetbrains-mono)] text-[7px] uppercase tracking-[0.2em] text-neutral-500">
                  Следующий бой
                </p>
                <p className="mt-1 font-[family-name:var(--font-geist-sans)] text-[10px] font-semibold text-white">
                  ACA 180 · TBA
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export const METATRON_NODES = buildMetatron13();
export const METATRON_LINE_COUNT = buildCompleteGraph(METATRON_NODES).length;
