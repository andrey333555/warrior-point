export function accentGlow(accent: string): string {
  const hex = accent.replace("#", "");
  if (hex.length !== 6) return "rgba(59,169,255,0.25)";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.25)`;
}
