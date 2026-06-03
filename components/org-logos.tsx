/**
 * org-logos.tsx — Neon SVG logotypes for martial arts organisations and clubs.
 *
 * All logos are path-based inline SVGs so they render identically on every
 * platform without font or image dependencies.
 *
 * Design language: minimal geometry + bold monospace letterforms + neon accent.
 */

type LogoProps = {
  size?: number;
  color?: string;
  className?: string;
};

// ── Promotion logos ───────────────────────────────────────────────────────────

/** ACA — Absolute Championship Akhmat */
export function AcaLogo({ size = 28, color = "#facc15", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="ACA"
    >
      {/* Hexagonal shield */}
      <polygon
        points="16,2 27,8.5 27,23.5 16,30 5,23.5 5,8.5"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        opacity="0.65"
      />
      {/* Inner shine */}
      <polygon
        points="16,5.5 24,10 24,22 16,26.5 8,22 8,10"
        fill={color}
        fillOpacity="0.07"
      />
      {/* A */}
      <path d="M8 22 L11 11 L14 22 M9.5 17.5h3" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      {/* C */}
      <path d="M17 22 C17 22 15 22 15 16.5 C15 11 17 11 17 11" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      {/* A */}
      <path d="M18 22 L21 11 L24 22 M19.5 17.5h3" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

/** RCC — Russian Cagefighting Championship */
export function RccLogo({ size = 28, color = "#f87171", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="RCC"
    >
      {/* Octagon cage */}
      <polygon
        points="11,2 21,2 30,11 30,21 21,30 11,30 2,21 2,11"
        fill="none"
        stroke={color}
        strokeWidth="1.3"
        opacity="0.6"
      />
      {/* R */}
      <path d="M6 22V11h4c2 0 3.5 1 3.5 3s-1.5 3-3.5 3h-4M10 17l3.5 5" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      {/* C */}
      <path d="M16 22 C16 22 14.5 22 14.5 16.5 C14.5 11 16 11 16 11" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* C */}
      <path d="M22 22 C22 22 20.5 22 20.5 16.5 C20.5 11 22 11 22 11" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

/** M-1 Global */
export function M1Logo({ size = 28, color = "#22d3ee", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="M-1 Global"
    >
      {/* Star / globe ring */}
      <circle cx="16" cy="16" r="13" fill="none" stroke={color} strokeWidth="1.3" opacity="0.5"/>
      <circle cx="16" cy="16" r="9" fill={color} fillOpacity="0.07"/>
      {/* M */}
      <path d="M6 22V11L11 18l5-7v11" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* dash */}
      <line x1="17.5" y1="16" x2="20" y2="16" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      {/* 1 */}
      <path d="M21.5 11 L23 9.5 M23 9.5 V22" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

/** Marathon 360 */
export function Marathon360Logo({ size = 28, color = "#a78bfa", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="Marathon 360"
    >
      <circle cx="16" cy="16" r="13" fill="none" stroke={color} strokeWidth="1.3" opacity="0.55"/>
      {/* 360 arc inside */}
      <path
        d="M6 16 A10 10 0 1 1 26 16"
        fill="none"
        stroke={color}
        strokeWidth="1.1"
        strokeDasharray="4 2"
        opacity="0.5"
      />
      {/* M */}
      <path d="M8 22V13L12.5 19l4.5-6v9" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* 360 abbreviated to ° symbol */}
      <circle cx="24" cy="11" r="2" fill="none" stroke={color} strokeWidth="1.2"/>
    </svg>
  );
}

// ── Club logos ─────────────────────────────────────────────────────────────────

/** Кузня (The Forge) — anvil + flame */
export function KuzniaLogo({ size = 28, color = "#22d3ee", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="БК Кузня"
    >
      {/* Anvil body */}
      <rect x="7" y="17" width="18" height="8" rx="2"
        fill={color} fillOpacity="0.14" stroke={color} strokeWidth="1.3"/>
      {/* Anvil horn */}
      <path d="M7 17 L4 14 L7 14" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" strokeLinejoin="round"/>
      {/* Anvil top bevel */}
      <rect x="9" y="13" width="14" height="4" rx="1"
        fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.2"/>
      {/* Hammer */}
      <rect x="14" y="4" width="5" height="4" rx="1"
        fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.2"/>
      <line x1="16.5" y1="8" x2="16.5" y2="13" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      {/* Spark / flame */}
      <path d="M22 9 Q24 7 23 5 Q25 6 24 9" fill={color} fillOpacity="0.5"/>
    </svg>
  );
}

/** Нарт — warrior shield with Н rune (placeholder) */
export function NartLogo({ size = 28, color = "#a78bfa", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="Нарт"
    >
      {/* Shield */}
      <path d="M16 3 L28 8 L28 18 Q28 27 16 30 Q4 27 4 18 L4 8 Z"
        fill="none" stroke={color} strokeWidth="1.3" opacity="0.65"/>
      <path d="M16 6 L25 10 L25 18 Q25 25 16 27.5 Q7 25 7 18 L7 10 Z"
        fill={color} fillOpacity="0.07"/>
      {/* Н glyph */}
      <line x1="11" y1="12" x2="11" y2="22" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="21" y1="12" x2="21" y2="22" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="11" y1="17" x2="21" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

/** Бульдог — bulldog head silhouette (placeholder) */
export function BulldogLogo({ size = 28, color = "#fb7185", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="Бульдог"
    >
      {/* Head circle */}
      <circle cx="16" cy="15" r="11" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.3" opacity="0.65"/>
      {/* Ears */}
      <circle cx="8" cy="9" r="3.5" fill="none" stroke={color} strokeWidth="1.1" opacity="0.5"/>
      <circle cx="24" cy="9" r="3.5" fill="none" stroke={color} strokeWidth="1.1" opacity="0.5"/>
      {/* Eyes */}
      <circle cx="12.5" cy="13" r="1.5" fill={color} fillOpacity="0.7"/>
      <circle cx="19.5" cy="13" r="1.5" fill={color} fillOpacity="0.7"/>
      {/* Snout */}
      <ellipse cx="16" cy="19" rx="5" ry="3" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1"/>
      {/* Nose */}
      <ellipse cx="16" cy="17.5" rx="2.5" ry="1.5" fill={color} fillOpacity="0.4"/>
      {/* Jowl lines */}
      <path d="M11 20 Q10 23 14 22" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round"/>
      <path d="M21 20 Q22 23 18 22" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round"/>
    </svg>
  );
}

/** Самсон — strongman / pillar icon (placeholder) */
export function SamsonLogo({ size = 28, color = "#facc15", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="Самсон"
    >
      {/* Pillar / column */}
      <rect x="12" y="6" width="8" height="20" rx="1.5"
        fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.3"/>
      {/* Top capital */}
      <rect x="9" y="5" width="14" height="3" rx="1"
        fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.2"/>
      {/* Base */}
      <rect x="9" y="24" width="14" height="3" rx="1"
        fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.2"/>
      {/* S monogram */}
      <path d="M14.5 11.5 C14.5 11.5 12.5 11.5 12.5 14 C12.5 14 12.5 16 16 16 C16 16 19.5 16 19.5 18.5 C19.5 21 17.5 21 17.5 21"
        fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      {/* strength dots */}
      <circle cx="6" cy="16" r="1.5" fill={color} fillOpacity="0.45"/>
      <circle cx="26" cy="16" r="1.5" fill={color} fillOpacity="0.45"/>
    </svg>
  );
}

/** Generic placeholder for unknown clubs */
export function ClubPlaceholderLogo({ size = 28, color = "#71717a", className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle cx="16" cy="16" r="12" fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5"/>
      <text x="16" y="20.5" textAnchor="middle" fontSize="10" fontWeight="700"
        fontFamily="monospace" fill={color} opacity="0.6">?</text>
    </svg>
  );
}
