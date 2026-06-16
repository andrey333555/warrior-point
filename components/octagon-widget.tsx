"use client";

import React from "react";

/**
 * OctagonWidget — 8-face UFC-style octagon fighter card.
 *
 * Geometry: 190 × 190 px SVG octagon (30%/70% cutpoints = 57/133px)
 * Container: 360 × 360 px (accommodates outward stat pods)
 *
 * 8 faces with stat pods:
 *   Face 1 (top 12h):     RECORD         26-4-1
 *   Face 2 (top-right):   ПРОМО          ACA · RCC · M-1
 *   Face 3 (right  3h):   ВЕС            66 / 70.3 кг
 *   Face 4 (bot-right):   УРОВЕНЬ        Level 17
 *   Face 5 (bottom 6h):   КЛУБ           Кузня
 *   Face 6 (bot-left):    СТИЛЬ          MMA · FW
 *   Face 7 (left   9h):   ELO            1642
 *   Face 8 (top-left):    СЕРИЯ          Daily streak
 *
 * Center: Fighter avatar (initials) + video play button.
 */

import { motion, AnimatePresence } from "framer-motion";
import { LotusIcon, PromotionsRow } from "@/components/lotus-icon";
import { VideoPlayer } from "@/components/video-player";
import { MetatronsCube, type MetatronRole } from "@/components/metatrons-cube";
import {
  AcaLogo,
  RccLogo,
  M1Logo,
  Marathon360Logo,
  AmcLogo,
  FngLogo,
  OpenFcLogo,
  UfcLogo,
  OneFcLogo,
  HardcoreLogo,
  TopDogLogo,
  NasheDeloLogo,
  KuzniaLogo,
  NartLogo,
  BulldogLogo,
  SamsonLogo,
} from "@/components/org-logos";
import {
  buildOrgPetals,
  findOrg,
  getDemoFighterOrgRecord,
} from "@/data/organisations";

// ── Geometry constants ────────────────────────────────────────────────────────

const OCT = 190;               // octagon SVG size in px
const P   = OCT * 0.30;        // 57  — 30% cutpoint
const Q   = OCT * 0.70;        // 133 — 70% cutpoint
const CX  = OCT / 2;           // 95  — octagon centre
const CONT = 360;              // container size
const OFF  = (CONT - OCT) / 2; // 85  — octagon offset in container

const OCT_POINTS =
  `${P},0 ${Q},0 ${OCT},${P} ${OCT},${Q} ${Q},${OCT} ${P},${OCT} 0,${Q} 0,${P}`;

// Face midpoints in octagon-local coords → container coords
const FACE_MID = [
  [CX,       0  ],  // 0 top
  [Q + P/2,  P/2],  // 1 top-right  ≈ (162, 29)
  [OCT,      CX ],  // 2 right
  [Q + P/2,  Q + P/2], // 3 bot-right ≈ (162, 162)
  [CX,       OCT],  // 4 bottom
  [P/2,      Q + P/2], // 5 bot-left  ≈ (29, 162)
  [0,        CX ],  // 6 left
  [P/2,      P/2],  // 7 top-left   ≈ (29, 29)
] as const;

// Outward normal directions (unit vectors)
const FACE_NORMAL = [
  [ 0,       -1      ],  // top
  [ 0.7071,  -0.7071 ],  // top-right
  [ 1,        0      ],  // right
  [ 0.7071,   0.7071 ],  // bot-right
  [ 0,        1      ],  // bottom
  [-0.7071,   0.7071 ],  // bot-left
  [-1,        0      ],  // left
  [-0.7071,  -0.7071 ],  // top-left
] as const;

const PUSH = 50; // px outward from face midpoint

/** Convert face index to absolute container position (pod anchor). */
function podPos(face: number): [number, number] {
  const [lx, ly] = FACE_MID[face];
  const [nx, ny] = FACE_NORMAL[face];
  return [
    OFF + lx + nx * PUSH,
    OFF + ly + ny * PUSH,
  ];
}

// ── Pod alignment per face ───────────────────────────────────────────────────

type PodAlign = "center" | "left" | "right";

const FACE_ALIGN: PodAlign[] = [
  "center", // top
  "left",   // top-right
  "left",   // right
  "left",   // bot-right
  "center", // bottom
  "right",  // bot-left
  "right",  // left
  "right",  // top-left
];

// ── Neon colour palette ──────────────────────────────────────────────────────

const CYAN    = "#22d3ee";
const FUCHSIA = "#e879f9";
const AMBER   = "#facc15";
const EMERALD = "#34d399";

// ── Promotion logo map ────────────────────────────────────────────────────────

/** Renders the correct SVG logo for a known promotion id. */
function OrgLogo({
  orgId,
  size,
  color,
}: {
  orgId: string;
  size: number;
  color: string;
}) {
  switch (orgId) {
    case "aca":         return <AcaLogo         size={size} color={color} />;
    case "rcc":         return <RccLogo         size={size} color={color} />;
    case "m1":          return <M1Logo          size={size} color={color} />;
    case "marathon360": return <Marathon360Logo size={size} color={color} />;
    case "amc":         return <AmcLogo         size={size} color={color} />;
    case "fng":         return <FngLogo         size={size} color={color} />;
    case "openfc":      return <OpenFcLogo      size={size} color={color} />;
    case "ufc":         return <UfcLogo         size={size} color={color} />;
    case "one":         return <OneFcLogo       size={size} color={color} />;
    case "hardcore":    return <HardcoreLogo    size={size} color={color} />;
    case "topdog":      return <TopDogLogo      size={size} color={color} />;
    case "nashedelo":   return <NasheDeloLogo   size={size} color={color} />;
    default:            return <AcaLogo         size={size} color={color} />;
  }
}

/** Demo fighter's 4 confirmed promotion ids in display order. */
const DEMO_PROMO_IDS = ["aca", "rcc", "m1", "marathon360"] as const;

function buildDemoPromoItems(iconSize: number) {
  return DEMO_PROMO_IDS.map((id) => {
    const org = findOrg(id);
    if (!org) return null;
    const record = getDemoFighterOrgRecord(id);
    const petals = buildOrgPetals(org, record);
    return {
      logo: <OrgLogo orgId={id} size={iconSize} color={org.accent} />,
      name: org.shortName,
      accent: org.accent,
      petals,
    };
  }).filter(Boolean) as {
    logo: React.ReactNode;
    name: string;
    accent: string;
    petals: { label: string; value: string }[];
  }[];
}

// ── Partner club placeholder data ────────────────────────────────────────────

const PARTNER_CLUBS = [
  {
    logo: <NartLogo size={26} color="#a78bfa" />,
    name: "Нарт",
    accent: "#a78bfa",
    petals: [
      { label: "Статус", value: "Партнёр" },
      { label: "Локация", value: "Уточняется" },
    ],
  },
  {
    logo: <BulldogLogo size={26} color="#fb7185" />,
    name: "Бульдог",
    accent: "#fb7185",
    petals: [
      { label: "Статус", value: "Партнёр" },
      { label: "Стиль", value: "MMA" },
    ],
  },
  {
    logo: <SamsonLogo size={26} color="#facc15" />,
    name: "Самсон",
    accent: "#facc15",
    petals: [
      { label: "Статус", value: "Партнёр" },
      { label: "Стиль", value: "Борьба" },
    ],
  },
];

// ── Component props ──────────────────────────────────────────────────────────

type OctagonWidgetProps = {
  /** Fighter initials shown in centre when no video. */
  initials: string;
  wins:    number;
  losses:  number;
  draws:   number;
  weightClass: string;
  level:   number;
  elo:     number;
  club:    string;
  style:   string;
  proSince?: number;
  promotions?: string[];
  /** Daily streak count. */
  streak:  number;
  /** Accent colour for the octagon border. */
  accent?: string;
  /** If true, a gold winner ring pulses. */
  isWinner?: boolean;
  /**
   * Optional highlight video URL.
   * Supports VK Видео, YouTube, Rutube, or direct iframe src.
   * Example: "https://vk.com/video-190459948_456239028"
   */
  videoSrc?: string;
  /** Optional poster/thumbnail image URL. */
  posterUrl?: string;
  /** Combat score shown above the in-octagon playlist. */
  combatScore?: number;
  /** Replace video centre with Metatron's Cube (click to cycle faces). */
  showPlaylist?: boolean;
  /** Role accent palette for the sacred geometry core. */
  metatronRole?: MetatronRole;
};

// ── Stat Pod subcomponent ────────────────────────────────────────────────────

function StatPod({
  label,
  value,
  sub,
  accent,
  align,
  x,
  y,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  align: PodAlign;
  x: number;
  y: number;
}) {
  const textAlign =
    align === "center" ? "text-center" :
    align === "left"   ? "text-left"   : "text-right";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        minWidth: 68,
        maxWidth: 90,
        pointerEvents: "none",
      }}
    >
      {/* Connector line */}
      <div
        className={["flex flex-col", textAlign].join(" ")}
      >
        <span
          className="font-[family-name:var(--font-geist-mono)] text-[8px] font-semibold uppercase tracking-[0.32em]"
          style={{ color: accent, opacity: 0.75 }}
        >
          {label}
        </span>
        <span
          className="font-[family-name:var(--font-geist-mono)] text-[11px] font-bold uppercase leading-tight tracking-[0.1em] text-zinc-100"
          style={{ textShadow: `0 0 10px ${accent}60` }}
        >
          {value}
        </span>
        {sub && (
          <span className="font-[family-name:var(--font-geist-mono)] text-[8px] uppercase tracking-[0.12em] text-zinc-600">
            {sub}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OctagonWidget({
  initials,
  wins,
  losses,
  draws,
  weightClass,
  level,
  elo,
  club,
  style,
  proSince,
  promotions,
  streak,
  accent = CYAN,
  isWinner = false,
  videoSrc,
  posterUrl,
  combatScore = 92.4,
  showPlaylist = false,
  metatronRole = "fighter",
}: OctagonWidgetProps) {
  const promoLine = promotions?.slice(0, 4).join(" · ") ?? "ACA · RCC · M-1 · M360";
  const promoItems = buildDemoPromoItems(24);

  const [p0x, p0y] = podPos(0); // top — record
  const [p1x, p1y] = podPos(1); // top-right — promotions
  const [p2x, p2y] = podPos(2); // right — weight
  const [p3x, p3y] = podPos(3); // bot-right — level
  const [p4x, p4y] = podPos(4); // bottom — club
  const [p5x, p5y] = podPos(5); // bot-left — style
  const [p6x, p6y] = podPos(6); // left — ELO
  const [p7x, p7y] = podPos(7); // top-left — streak / pro since

  const winnerGlow: React.CSSProperties = isWinner
    ? { filter: `drop-shadow(0 0 12px ${AMBER}) drop-shadow(0 0 24px ${AMBER}40)` }
    : {};

  return (
    <div
      className="relative mx-auto shrink-0 select-none"
      style={{ width: CONT, height: CONT }}
    >
      {/* ── Octagon SVG border ──────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${OCT} ${OCT}`}
        width={OCT}
        height={OCT}
        className="absolute"
        style={{
          left: OFF,
          top: OFF,
          overflow: "visible",
          ...winnerGlow,
        }}
        aria-hidden
      >
        {/* Outer glow ring */}
        {isWinner && (
          <motion.polygon
            points={OCT_POINTS}
            fill="none"
            stroke={AMBER}
            strokeWidth="2"
            opacity={0.5}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Main border */}
        <polygon
          points={OCT_POINTS}
          fill="none"
          stroke={isWinner ? AMBER : accent}
          strokeWidth="1.4"
          opacity="0.7"
          style={{ filter: `drop-shadow(0 0 5px ${isWinner ? AMBER : accent})` }}
        />

        {/* Inner echo ring */}
        <polygon
          points={OCT_POINTS}
          fill={`${accent}08`}
          stroke={accent}
          strokeWidth="0.5"
          opacity="0.25"
          transform={`scale(0.92) translate(${OCT * 0.04}, ${OCT * 0.04})`}
        />

        {/* Face tick marks */}
        {FACE_MID.map(([fx, fy], i) => {
          const [nx, ny] = FACE_NORMAL[i];
          const tickLen = 5;
          return (
            <line
              key={i}
              x1={fx}
              y1={fy}
              x2={fx + nx * tickLen}
              y2={fy + ny * tickLen}
              stroke={accent}
              strokeWidth="0.8"
              opacity="0.45"
            />
          );
        })}
      </svg>

      {/* ── Centre: video OR combat score + playlist ───────────────────── */}
      <div
        className="absolute flex flex-col items-center justify-center overflow-hidden"
        style={{
          left: OFF,
          top: OFF,
          width: OCT,
          height: OCT,
          clipPath: `polygon(${P}px 0px, ${Q}px 0px, ${OCT}px ${P}px, ${OCT}px ${Q}px, ${Q}px ${OCT}px, ${P}px ${OCT}px, 0px ${Q}px, 0px ${P}px)`,
          background: `radial-gradient(ellipse at center, ${accent}14 0%, #09090b 70%)`,
        }}
      >
        {showPlaylist ? (
          <MetatronsCube
            role={metatronRole}
            combatScore={combatScore}
            size={OCT - 12}
            videoSrc={videoSrc}
            posterInitials={initials}
            posterUrl={posterUrl}
          />
        ) : (
          <VideoPlayer
            src={videoSrc}
            posterInitials={initials}
            posterUrl={posterUrl}
            accent={accent}
            size={OCT}
          />
        )}
      </div>

      {/* ── 8 Stat Pods ─────────────────────────────────────────────────── */}

      {/* Face 1 — RECORD */}
      <StatPod
        label="Рекорд"
        value={`${wins}-${losses}-${draws}`}
        sub={draws > 0 ? `Н: ${draws}` : undefined}
        accent={EMERALD}
        align={FACE_ALIGN[0]}
        x={p0x}
        y={p0y}
      />

      {/* Face 2 — PROMOTIONS with Lotus effect (4 icons, data from organisations registry) */}
      <div
        className="absolute flex flex-col items-start gap-0.5"
        style={{ left: p1x, top: p1y, transform: "translate(-50%, -50%)", zIndex: 30 }}
      >
        <PromotionsRow items={promoItems} />
        <span
          className="mx-auto font-[family-name:var(--font-geist-mono)] text-[7px] uppercase tracking-[0.28em]"
          style={{ color: AMBER, opacity: 0.55 }}
        >
          Промо
        </span>
      </div>

      {/* Face 3 — WEIGHT */}
      <StatPod
        label="Вес"
        value={weightClass}
        accent={FUCHSIA}
        align={FACE_ALIGN[2]}
        x={p2x}
        y={p2y}
      />

      {/* Face 4 — LEVEL */}
      <StatPod
        label="Уровень"
        value={`Lvl ${level}`}
        sub="/23"
        accent={FUCHSIA}
        align={FACE_ALIGN[3]}
        x={p3x}
        y={p3y}
      />

      {/* Face 5 — CLUB with Lotus effect */}
      <div
        className="absolute flex flex-col items-center gap-1"
        style={{ left: p4x, top: p4y, transform: "translate(-50%, -50%)", zIndex: 30 }}
      >
        <LotusIcon
          name="Кузня"
          accent={CYAN}
          size={32}
          radius={60}
          angleOffset={90}
          petals={[
            { label: "Главный тренер", value: "Олег Владимирович" },
            { label: "Специализация", value: "MMA · Кикбоксинг" },
            { label: "Залы", value: "Анапа / Краснодар" },
            { label: "Про с", value: "2013" },
          ]}
        >
          <KuzniaLogo size={28} color={CYAN} />
        </LotusIcon>
        <span
          className="font-[family-name:var(--font-geist-mono)] text-[8px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: CYAN, opacity: 0.7 }}
        >
          {club}
        </span>
      </div>

      {/* Face 6 — STYLE */}
      <StatPod
        label="Стиль"
        value={style}
        accent={EMERALD}
        align={FACE_ALIGN[5]}
        x={p5x}
        y={p5y}
      />

      {/* Face 7 — ELO */}
      <StatPod
        label="ELO"
        value={String(elo)}
        accent={AMBER}
        align={FACE_ALIGN[6]}
        x={p6x}
        y={p6y}
      />

      {/* Face 8 — STREAK / PRO SINCE */}
      <StatPod
        label="Серия"
        value={streak > 0 ? `×${streak}` : "Нет"}
        sub={proSince ? `Про с ${proSince}` : undefined}
        accent={AMBER}
        align={FACE_ALIGN[7]}
        x={p7x}
        y={p7y}
      />
    </div>
  );
}
