"use client";

interface LeagueBadgeProps {
  league: "ACA" | "RCC" | "FN" | "UFC" | "BELLATOR" | "ONE";
  active?: boolean;
  onClick?: () => void;
}

const LEAGUE_COLORS = {
  UFC: {
    bg: "from-red-600/30 to-red-800/20",
    border: "border-red-500/50",
    text: "text-red-400",
  },
  ACA: {
    bg: "from-purple-600/30 to-purple-800/20",
    border: "border-purple-500/50",
    text: "text-purple-400",
  },
  RCC: {
    bg: "from-blue-600/30 to-blue-800/20",
    border: "border-blue-500/50",
    text: "text-blue-400",
  },
  FN: {
    bg: "from-yellow-600/30 to-yellow-800/20",
    border: "border-yellow-500/50",
    text: "text-yellow-400",
  },
  BELLATOR: {
    bg: "from-orange-600/30 to-orange-800/20",
    border: "border-orange-500/50",
    text: "text-orange-400",
  },
  ONE: {
    bg: "from-green-600/30 to-green-800/20",
    border: "border-green-500/50",
    text: "text-green-400",
  },
};

const LEAGUE_ICONS = {
  UFC: "🥊",
  ACA: "⚔️",
  RCC: "🛡️",
  FN: "⚡",
  BELLATOR: "🔥",
  ONE: "🌏",
};

export function LeagueBadge({
  league,
  active = false,
  onClick,
}: LeagueBadgeProps) {
  const colors = LEAGUE_COLORS[league];
  const icon = LEAGUE_ICONS[league];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border bg-gradient-to-br px-4 py-2 transition-all ${colors.bg} ${colors.border} ${
        active ? "scale-105 ring-2 ring-white/30" : "opacity-70 hover:opacity-100"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className={`text-sm font-bold ${colors.text}`}>{league}</span>
    </button>
  );
}
