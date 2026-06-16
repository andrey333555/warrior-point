/**
 * org-logos.tsx — Neon SVG logotypes for martial arts organisations and clubs.
 *
 * Design language: minimal geometry + bold monospace letterforms + neon accent.
 *
 * Props:
 *   size     — icon diameter in px (default 28)
 *   color    — brand accent hex (used when active)
 *   active   — true (default): renders in brand color; false: muted zinc gray
 *   className — forwarded to <svg>
 *
 * Backward-compatible: omitting `active` keeps branded color.
 */

type LogoProps = {
  size?: number;
  color?: string;
  className?: string;
  /** false → muted gray silhouette; true (default) → brand neon */
  active?: boolean;
};

/** Resolve render color: brand when active, zinc-600 when dimmed. */
function rc(color: string, active: boolean | undefined): string {
  return active === false ? "#52525b" : color;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── ACA — Absolute Championship Akhmat ───────────────────────────────────────

export function AcaLogo({ size = 28, color = "#facc15", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="ACA" fill="none">
      {/* Hexagonal shield */}
      <polygon points="16,2 27,8.5 27,23.5 16,30 5,23.5 5,8.5"
        stroke={c} strokeWidth="1.4" opacity={active === false ? 0.4 : 0.7} />
      <polygon points="16,5.5 24,10 24,22 16,26.5 8,22 8,10"
        fill={c} fillOpacity="0.08" />
      {/* Horizontal accent bars */}
      <line x1="5" y1="16" x2="27" y2="16" stroke={c} strokeWidth="0.6" opacity="0.3" />
      {/* A */}
      <path d="M7.5 22 L11 11 L14.5 22 M9 17.8h4" stroke={c} strokeWidth="1.35" strokeLinecap="round" />
      {/* C — open arc */}
      <path d="M17.5 11.5 C15.5 11.5 14 13 14 16.5 C14 20 15.5 21.5 17.5 21.5"
        stroke={c} strokeWidth="1.35" strokeLinecap="round" />
      {/* A */}
      <path d="M18 22 L21.5 11 L25 22 M19.5 17.8h4" stroke={c} strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

// ── RCC — Russian Cagefighting Championship ────────────────────────────────────

export function RccLogo({ size = 28, color = "#f87171", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="RCC" fill="none">
      {/* Octagon cage */}
      <polygon points="11,2 21,2 30,11 30,21 21,30 11,30 2,21 2,11"
        stroke={c} strokeWidth="1.3" opacity={active === false ? 0.35 : 0.65} />
      <polygon points="11,4.5 21,4.5 28,11 28,21 21,28.5 11,28.5 4,21 4,11"
        fill={c} fillOpacity="0.05" />
      {/* R */}
      <path d="M5 23V11h4.5c2.2 0 3.5 1.2 3.5 3s-1.3 3-3.5 3H5 M9.5 17l4 6"
        stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      {/* C */}
      <path d="M18 11.5 C16 11.5 14.5 13 14.5 16.5 C14.5 20 16 21.5 18 21.5"
        stroke={c} strokeWidth="1.25" strokeLinecap="round" />
      {/* C */}
      <path d="M25 11.5 C23 11.5 21.5 13 21.5 16.5 C21.5 20 23 21.5 25 21.5"
        stroke={c} strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

// ── M-1 Global ────────────────────────────────────────────────────────────────

export function M1Logo({ size = 28, color = "#22d3ee", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="M-1 Global" fill="none">
      <circle cx="16" cy="16" r="13" stroke={c} strokeWidth="1.3" opacity={active === false ? 0.3 : 0.55} />
      {/* Globe meridian */}
      <ellipse cx="16" cy="16" rx="7" ry="13" stroke={c} strokeWidth="0.7" opacity="0.25" />
      <line x1="3" y1="16" x2="29" y2="16" stroke={c} strokeWidth="0.7" opacity="0.25" />
      {/* M */}
      <path d="M5 22V11L10.5 18.5 16 11v11" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* dash */}
      <line x1="17.5" y1="16.5" x2="20.5" y2="16.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      {/* 1 */}
      <path d="M22 12 L23.5 10.5 M23.5 10.5 V23" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Marathon 360 ──────────────────────────────────────────────────────────────

export function Marathon360Logo({ size = 28, color = "#a78bfa", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Marathon 360" fill="none">
      <circle cx="16" cy="16" r="13" stroke={c} strokeWidth="1.3" opacity={active === false ? 0.3 : 0.55} />
      <path d="M5.5 16 A10.5 10.5 0 1 1 26.5 16"
        stroke={c} strokeWidth="1.1" strokeDasharray="3 2.2" opacity="0.45" />
      {/* M */}
      <path d="M7 22V12L12 19.5 17 12v10" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {/* 360° symbol */}
      <circle cx="24" cy="10.5" r="2.5" stroke={c} strokeWidth="1.2" />
      {/* tiny arrow on 360 */}
      <path d="M21.5 10.5 L19 10.5" stroke={c} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// ── Fight Nights Global (FNG) — fist inside diamond ──────────────────────────

export function FngLogo({ size = 28, color = "#34d399", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Fight Nights Global" fill="none">
      {/* Diamond frame */}
      <polygon points="16,2 30,16 16,30 2,16"
        stroke={c} strokeWidth="1.3" opacity={active === false ? 0.35 : 0.65} />
      <polygon points="16,5.5 26.5,16 16,26.5 5.5,16"
        fill={c} fillOpacity="0.07" />
      {/* Star/night dot top-right */}
      <circle cx="26" cy="6" r="1.2" fill={c} opacity="0.6" />
      <circle cx="23" cy="4" r="0.7" fill={c} opacity="0.4" />
      {/* F */}
      <path d="M8 23V11h7 M8 17h5.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {/* N */}
      <path d="M17 23V11L24 23V11" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Open FC — open octagon gate ───────────────────────────────────────────────

export function OpenFcLogo({ size = 28, color = "#fb923c", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Open FC" fill="none">
      {/* Outer open octagon (broken top = "open") */}
      <path d="M12,2 H20 M20,2 L30,12 L30,20 L24,28 L8,28 L2,20 L2,12 L12,2"
        stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
        opacity={active === false ? 0.35 : 0.65} />
      <path d="M12,4.5 H20 L28.5,12 L28.5,20 L23,27 L9,27 L3.5,20 L3.5,12 L12,4.5"
        fill={c} fillOpacity="0.06" />
      {/* O */}
      <ellipse cx="11" cy="17" rx="3.5" ry="4.5"
        stroke={c} strokeWidth="1.25" />
      {/* F */}
      <path d="M17 22V12h6 M17 17h5" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      {/* C small subscript */}
      <path d="M22.5 24 C20.5 24 19.5 25 19.5 26 C19.5 27 20.5 27.5 22.5 27.5"
        stroke={c} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// ── UFC — Ultimate Fighting Championship ──────────────────────────────────────

export function UfcLogo({ size = 28, color = "#ef4444", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="UFC" fill="none">
      {/* Bold octagon — signature UFC shape */}
      <polygon points="11,2 21,2 30,11 30,21 21,30 11,30 2,21 2,11"
        stroke={c} strokeWidth="1.6" opacity={active === false ? 0.35 : 0.75} />
      <polygon points="11,4.5 21,4.5 28,11 28,21 21,28.5 11,28.5 4,21 4,11"
        fill={c} fillOpacity={active === false ? 0.03 : 0.1} />
      {/* U */}
      <path d="M5 11V20 C5 23 8 24 10.5 24 C13 24 16 23 16 20 V11"
        stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* F */}
      <path d="M18 24V11h7 M18 17.5h5.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* subtle corner cut marks */}
      <line x1="9" y1="5" x2="9" y2="7" stroke={c} strokeWidth="0.8" opacity="0.4" />
      <line x1="23" y1="5" x2="23" y2="7" stroke={c} strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

// ── ONE Championship ──────────────────────────────────────────────────────────

export function OneFcLogo({ size = 28, color = "#dc2626", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="ONE Championship" fill="none">
      {/* Bold outer ring */}
      <circle cx="16" cy="16" r="13.5" stroke={c} strokeWidth="1.6" opacity={active === false ? 0.35 : 0.75} />
      <circle cx="16" cy="16" r="10" stroke={c} strokeWidth="0.7" opacity="0.2" />
      <circle cx="16" cy="16" r="13.5" fill={c} fillOpacity={active === false ? 0.03 : 0.08} />
      {/* O */}
      <ellipse cx="8.5" cy="16" rx="3" ry="4.5"
        stroke={c} strokeWidth="1.3" />
      {/* N */}
      <path d="M13.5 21V11L19 21V11" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {/* E */}
      <path d="M21 11h5.5 M21 11V21 M21 16h4.5 M21 21h5.5"
        stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Наше Дело — Slavic star with Н·Д glyphs ──────────────────────────────────

export function NasheDeloLogo({ size = 28, color = "#4ade80", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Наше Дело" fill="none">
      <circle cx="16" cy="16" r="13" stroke={c} strokeWidth="1.3" opacity={active === false ? 0.35 : 0.65} />
      <circle cx="16" cy="16" r="9" fill={c} fillOpacity="0.07" />
      {/* 6-point star */}
      <polygon
        points="16,5.5 18.2,12 25.5,12 19.5,16.5 21.8,24 16,20 10.2,24 12.5,16.5 6.5,12 13.8,12"
        fill={c} fillOpacity={active === false ? 0.1 : 0.2}
        stroke={c} strokeWidth="0.7" opacity="0.7" />
      {/* Н */}
      <line x1="10.5" y1="12.5" x2="10.5" y2="19.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="12.5" x2="14.5" y2="19.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="16" x2="14.5" y2="16" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      {/* · separator */}
      <circle cx="16.5" cy="16" r="0.8" fill={c} opacity="0.6" />
      {/* Д */}
      <path d="M18 19.5 L18 13 L23 13 L23 19.5 M16.5 19.5 L24.5 19.5"
        stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUBS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Кузня — anvil + hammer + spark ───────────────────────────────────────────

export function KuzniaLogo({ size = 28, color = "#22d3ee", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="БК Кузня" fill="none">
      <rect x="7" y="18" width="18" height="8" rx="2"
        fill={c} fillOpacity="0.12" stroke={c} strokeWidth="1.3" />
      <path d="M7 18 L4 15 L7 15" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="1" strokeLinejoin="round" />
      <rect x="9" y="13.5" width="14" height="4.5" rx="1"
        fill={c} fillOpacity="0.16" stroke={c} strokeWidth="1.2" />
      <rect x="13.5" y="4.5" width="5" height="4" rx="1"
        fill={c} fillOpacity="0.22" stroke={c} strokeWidth="1.2" />
      <line x1="16" y1="8.5" x2="16" y2="13.5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      {/* Sparks */}
      <path d="M22 9 Q24.5 6.5 23 4.5 Q25.5 5.5 24.5 9" fill={c} fillOpacity="0.55" />
      <circle cx="26" cy="7" r="0.9" fill={c} opacity="0.4" />
    </svg>
  );
}

// ── Top Dog — geometric TD with pentagon ──────────────────────────────────────

export function TopDogLogo({ size = 28, color = "#fb7185", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Top Dog" fill="none">
      <polygon points="16,2 29,11 24,27 8,27 3,11"
        stroke={c} strokeWidth="1.3" opacity={active === false ? 0.35 : 0.65} />
      <polygon points="16,5 26,12.5 22,25 10,25 6,12.5"
        fill={c} fillOpacity="0.07" />
      {/* T */}
      <line x1="6" y1="12.5" x2="14" y2="12.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="10" y1="12.5" x2="10" y2="22.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      {/* D */}
      <path d="M15.5 12.5h4c3.5 0 4.5 2 4.5 5s-1 5-4.5 5h-4V12.5z"
        fill={c} fillOpacity="0.1" stroke={c} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// ── Hardcore MMA — lightning bolt hexagon ────────────────────────────────────

export function HardcoreLogo({ size = 28, color = "#e879f9", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Hardcore MMA" fill="none">
      <polygon points="16,2 27,8.5 27,23.5 16,30 5,23.5 5,8.5"
        stroke={c} strokeWidth="1.3" opacity={active === false ? 0.35 : 0.65} />
      <polygon points="16,5 24.5,10 24.5,22 16,27 7.5,22 7.5,10"
        fill={c} fillOpacity="0.07" />
      {/* Lightning bolt */}
      <path d="M18 5 L11 17 L16 17 L14 27 L21 15 L16 15 Z"
        fill={c} fillOpacity={active === false ? 0.3 : 0.55}
        stroke={c} strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

// ── AMC Fight Nights — diamond frame ─────────────────────────────────────────

export function AmcLogo({ size = 28, color = "#34d399", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="AMC Fight Nights" fill="none">
      <polygon points="16,2 30,16 16,30 2,16"
        stroke={c} strokeWidth="1.3" opacity={active === false ? 0.35 : 0.65} />
      <polygon points="16,5.5 26.5,16 16,26.5 5.5,16"
        fill={c} fillOpacity="0.07" />
      {/* A */}
      <path d="M6.5 22 L10.5 12 L14.5 22 M8 18h5" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      {/* M */}
      <path d="M15 22V13l3.5 5 3.5-5v9" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* C hint arc */}
      <path d="M9 25.5 Q16 28.5 23 25.5" stroke={c} strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// ── Нарт — shield with Н glyph ────────────────────────────────────────────────

export function NartLogo({ size = 28, color = "#a78bfa", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Нарт" fill="none">
      <path d="M16 3 L28 8 L28 18 Q28 27 16 30 Q4 27 4 18 L4 8 Z"
        stroke={c} strokeWidth="1.3" opacity={active === false ? 0.35 : 0.65} />
      <path d="M16 6 L25 10 L25 18 Q25 25 16 27.5 Q7 25 7 18 L7 10 Z"
        fill={c} fillOpacity="0.07" />
      <line x1="11" y1="12" x2="11" y2="22" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="21" y1="12" x2="21" y2="22" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="11" y1="17" x2="21" y2="17" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ── Бульдог — head silhouette ─────────────────────────────────────────────────

export function BulldogLogo({ size = 28, color = "#fb7185", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Бульдог" fill="none">
      <circle cx="16" cy="15" r="11" fill={c} fillOpacity="0.09" stroke={c} strokeWidth="1.3" opacity={active === false ? 0.4 : 0.65} />
      <circle cx="8" cy="9" r="3.5" stroke={c} strokeWidth="1.1" opacity="0.5" />
      <circle cx="24" cy="9" r="3.5" stroke={c} strokeWidth="1.1" opacity="0.5" />
      <circle cx="12.5" cy="13" r="1.5" fill={c} fillOpacity="0.7" />
      <circle cx="19.5" cy="13" r="1.5" fill={c} fillOpacity="0.7" />
      <ellipse cx="16" cy="19" rx="5" ry="3" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="1" />
      <ellipse cx="16" cy="17.5" rx="2.5" ry="1.5" fill={c} fillOpacity="0.4" />
      <path d="M11 20 Q10 23 14 22" stroke={c} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M21 20 Q22 23 18 22" stroke={c} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

// ── Самсон — pillar / column ──────────────────────────────────────────────────

export function SamsonLogo({ size = 28, color = "#facc15", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-label="Самсон" fill="none">
      <rect x="12" y="6" width="8" height="20" rx="1.5"
        fill={c} fillOpacity="0.1" stroke={c} strokeWidth="1.3" />
      <rect x="9" y="5" width="14" height="3" rx="1"
        fill={c} fillOpacity="0.18" stroke={c} strokeWidth="1.2" />
      <rect x="9" y="24" width="14" height="3" rx="1"
        fill={c} fillOpacity="0.18" stroke={c} strokeWidth="1.2" />
      <path d="M14.5 11.5 C14.5 11.5 12.5 11.5 12.5 14 C12.5 16 14.5 16.5 16 16.5 C17.5 16.5 19.5 17 19.5 19.5 C19.5 21.5 17.5 21.5 17.5 21.5"
        stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="6" cy="16" r="1.5" fill={c} fillOpacity="0.45" />
      <circle cx="26" cy="16" r="1.5" fill={c} fillOpacity="0.45" />
    </svg>
  );
}

// ── Generic placeholder ────────────────────────────────────────────────────────

export function ClubPlaceholderLogo({ size = 28, color = "#71717a", className, active }: LogoProps) {
  const c = rc(color, active);
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="none">
      <circle cx="16" cy="16" r="12"
        stroke={c} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5" />
      <text x="16" y="20.5" textAnchor="middle" fontSize="10" fontWeight="700"
        fontFamily="monospace" fill={c} opacity="0.6">?</text>
    </svg>
  );
}
