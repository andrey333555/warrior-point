"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Golden-ratio honeycomb layout.
 *
 * The big central hex (the warrior's avatar) stays at `centerSize`.
 * Every satellite ("сотка") is drawn at `centerSize / φ` by default so the
 * cluster reads as a single jeweller-grade object.
 *
 * Slots come in two flavours:
 *   • `face: 0..5` — locked onto one of the six pointy-top grains of the core,
 *     touching it edge-to-edge (centre-to-centre = apothemᶜ + apothemˢ + gap).
 *   • `rank: 1..n` — placed by phyllotaxis (golden angle ≈ 137.508°) drifting
 *     outward by `cellSize · 0.55` per step. Future gifts / boosts can simply
 *     append `{ rank: 1, accent: "gold", … }` and the cluster keeps balance.
 *
 *           5 ─ top-right             4 ─ top-left
 *               ╲      ╱
 *                ◇ core
 *               ╱      ╲
 *           1 ─ bottom-right          2 ─ bottom-left
 *                  0 ─ right          3 ─ left
 */

export const PHI = 1.6180339887;
/** Golden angle in radians (Vogel's spiral). ≈ 2.39996 rad ≈ 137.508°. */
export const GOLDEN_ANGLE_RAD = Math.PI * (3 - Math.sqrt(5));

export type Face = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Angle (rad) from the cluster centre to each face's midpoint.
 * Pointy-top hex → faces sit at 0°, 60°, 120°, …
 */
const FACE_ANGLE_RAD: Record<Face, number> = {
  0: 0, // right
  1: Math.PI / 3, // bottom-right
  2: (2 * Math.PI) / 3, // bottom-left
  3: Math.PI, // left
  4: (4 * Math.PI) / 3, // top-left
  5: (5 * Math.PI) / 3, // top-right
};

type RenderOpts = { cx: number; cy: number; size: number };

export type SotkaSlot = {
  id?: string;
  render: (opts: RenderOpts) => ReactNode;
} & (
  | { face: Face; rank?: never }
  | { rank: number; face?: never; spiralAngleOffset?: number }
);

type HexClusterProps = {
  center: (opts: { size: number }) => ReactNode;
  cells: ReadonlyArray<SotkaSlot>;
  /** Diameter of the central hex (px). */
  centerSize?: number;
  /** Diameter of every satellite. Default = `centerSize / φ` (≈ 1.618×). */
  cellSize?: number;
  /** Extra clearance added to the touching distance (px). */
  gap?: number;
  /** Angular offset (rad) applied to the first spiral seat (rank=1). */
  spiralOrigin?: number;
  /** Outward drift per spiral rank (px). Default ≈ `cellSize · 0.55`. */
  spiralStep?: number;
  /** Stroke inset on every hex (must mirror hex-avatar / hex-badge). */
  hexInset?: number;
  className?: string;
};

export function HexCluster({
  center,
  cells,
  centerSize = 160,
  cellSize,
  gap = 4,
  spiralOrigin = -Math.PI / 2,
  spiralStep,
  hexInset = 4,
  className,
}: HexClusterProps) {
  const satSize = cellSize ?? Math.round(centerSize / PHI);

  const rCore = centerSize / 2 - hexInset;
  const rSat = satSize / 2 - hexInset;

  /** Distance from hex centre to the midpoint of any face (apothem). */
  const apothemCore = (rCore * Math.sqrt(3)) / 2;
  const apothemSat = (rSat * Math.sqrt(3)) / 2;

  /** Centre-to-centre offset that makes two pointy-top hexes share an edge. */
  const faceCenterDistance = apothemCore + apothemSat + gap;

  /** Phyllotaxis step — keeps gifts orbiting tightly enough to read as a cluster. */
  const phyllotaxisStep = spiralStep ?? satSize * 0.55;

  const positions = cells.map((cell, i) => {
    if ("face" in cell && cell.face !== undefined) {
      const angle = FACE_ANGLE_RAD[cell.face];

      return {
        cell,
        angle,
        radius: faceCenterDistance,
        cx: faceCenterDistance * Math.cos(angle),
        cy: faceCenterDistance * Math.sin(angle),
        key: cell.id ?? `face-${cell.face}-${i}`,
      };
    }

    const rank = Math.max(1, cell.rank ?? 1);
    const angle =
      spiralOrigin + rank * GOLDEN_ANGLE_RAD + (cell.spiralAngleOffset ?? 0);
    const radius = faceCenterDistance + (rank - 1) * phyllotaxisStep;

    return {
      cell,
      angle,
      radius,
      cx: radius * Math.cos(angle),
      cy: radius * Math.sin(angle),
      key: cell.id ?? `spiral-${rank}-${i}`,
    };
  });

  /** Auto-fit the wrapper so deep spiral seats never clip the layout. */
  const reach = positions.reduce(
    (m, p) =>
      Math.max(m, Math.abs(p.cx) + satSize / 2, Math.abs(p.cy) + satSize / 2),
    centerSize / 2,
  );
  const containerSize = Math.ceil(2 * reach) + 8;

  const containerStyle: CSSProperties = {
    width: containerSize,
    height: containerSize,
  };

  return (
    <div
      className={`relative shrink-0 ${className ?? ""}`}
      style={containerStyle}
      aria-hidden={false}
    >
      <div
        className="absolute z-10"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {center({ size: centerSize })}
      </div>

      {positions.map((p) => (
        <div
          key={p.key}
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${p.cx.toFixed(2)}px), calc(-50% + ${p.cy.toFixed(2)}px))`,
          }}
        >
          {p.cell.render({ cx: p.cx, cy: p.cy, size: satSize })}
        </div>
      ))}
    </div>
  );
}
