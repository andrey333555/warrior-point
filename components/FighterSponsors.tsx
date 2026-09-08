"use client";

import { motion } from "framer-motion";
import { Award, Plus } from "lucide-react";

interface Sponsor {
  name: string;
  logo?: string;
  tier: "gold" | "silver" | "bronze";
  url?: string;
}

interface FighterSponsorsProps {
  sponsors?: Sponsor[];
  isOwner?: boolean;
}

const TIER = {
  gold: {
    label: "GOLD",
    border: "border-yellow-400/50",
    bg: "from-yellow-500/20 to-yellow-700/10",
    text: "text-yellow-400",
  },
  silver: {
    label: "SILVER",
    border: "border-gray-300/40",
    bg: "from-gray-400/20 to-gray-600/10",
    text: "text-gray-300",
  },
  bronze: {
    label: "BRONZE",
    border: "border-orange-400/40",
    bg: "from-orange-500/20 to-orange-700/10",
    text: "text-orange-400",
  },
} as const;

const DEFAULT_SPONSORS: Sponsor[] = [
  { name: "Venum", tier: "gold" },
  { name: "Hayabusa", tier: "silver" },
  { name: "Fairtex", tier: "bronze" },
];

export default function FighterSponsors({
  sponsors = DEFAULT_SPONSORS,
  isOwner = false,
}: FighterSponsorsProps) {
  return (
    <div className="w-full mt-6 max-w-full overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
          <Award size={14} />
          Спонсоры
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {sponsors.map((sponsor, index) => {
          const tier = TIER[sponsor.tier];
          const card = (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`rounded-xl border bg-gradient-to-br p-3 text-center ${tier.border} ${tier.bg}`}
            >
              {sponsor.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="mb-1 h-8 w-full object-contain"
                />
              ) : (
                <p className={`text-xs font-bold ${tier.text}`}>{sponsor.name}</p>
              )}
              <p
                className={`mt-1 text-[9px] font-semibold uppercase tracking-wider ${tier.text}`}
              >
                {tier.label}
              </p>
            </motion.div>
          );

          return sponsor.url ? (
            <a
              key={sponsor.name}
              href={sponsor.url}
              target="_blank"
              rel="noreferrer"
            >
              {card}
            </a>
          ) : (
            <div key={sponsor.name}>{card}</div>
          );
        })}
        {isOwner ? (
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 p-3 text-gray-500 transition-colors hover:border-yellow-400/40 hover:text-white"
          >
            <Plus size={18} />
            <span className="text-[9px] uppercase">Добавить</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
