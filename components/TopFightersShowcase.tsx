"use client";

import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Award } from "lucide-react";

const TOP_FIGHTERS = [
  {
    rank: 1,
    name: "Александр Шлеменко",
    elo: 3247,
    record: "58-11-0",
    round: 23,
    isLegend: true,
    isVerified: true,
    streak: 12,
  },
  {
    rank: 2,
    name: "Петр Ян",
    elo: 3180,
    record: "17-6-0",
    round: 22,
    isLegend: true,
    isVerified: true,
    streak: 3,
  },
  {
    rank: 3,
    name: "Александр Волков",
    elo: 2950,
    record: "38-11-0",
    round: 21,
    isLegend: true,
    isVerified: true,
  },
  {
    rank: 4,
    name: "Сергей Романов",
    elo: 2720,
    record: "27-6-0",
    round: 20,
    isVerified: true,
    streak: 7,
  },
] as const;

function rankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="text-yellow-400" size={20} />;
    case 2:
      return <Medal className="text-gray-300" size={20} />;
    case 3:
      return <Award className="text-orange-400" size={20} />;
    default:
      return <span className="font-bold text-gray-500">#{rank}</span>;
  }
}

function rankBg(rank: number) {
  switch (rank) {
    case 1:
      return "from-yellow-500/20 to-yellow-600/10 border-yellow-400/30";
    case 2:
      return "from-gray-400/20 to-gray-500/10 border-gray-400/30";
    case 3:
      return "from-orange-500/20 to-orange-600/10 border-orange-400/30";
    default:
      return "from-gray-800/50 to-gray-900/50 border-gray-700";
  }
}

export default function TopFightersShowcase() {
  const goAuth = () => {
    window.location.href = "/register/fighter";
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Trophy className="text-yellow-400" size={24} />
            Топ бойцов
          </h2>
          <p className="mt-1 text-sm text-gray-500">Легенды Round 23</p>
        </div>
        <a
          href="/?tab=leaderboard"
          className="text-sm font-semibold text-yellow-400 hover:underline"
        >
          Смотреть все →
        </a>
      </div>
      <div className="space-y-3">
        {TOP_FIGHTERS.map((fighter, index) => (
          <motion.div
            key={fighter.rank}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <div
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-gradient-to-r p-4 transition-transform hover:scale-[1.02] ${rankBg(fighter.rank)}`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {rankIcon(fighter.rank)}
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-yellow-400/20 bg-gradient-to-br from-gray-700 to-gray-800">
                <span className="text-lg font-bold text-white">
                  {fighter.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-bold text-white">{fighter.name}</p>
                  {"isVerified" in fighter && fighter.isVerified ? (
                    <span className="text-xs text-yellow-400">✓</span>
                  ) : null}
                  {"isLegend" in fighter && fighter.isLegend ? (
                    <span className="rounded-full bg-yellow-400/20 px-1.5 py-0.5 text-xs font-semibold text-yellow-400">
                      LEGEND
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                  <span>Раунд {fighter.round}</span>
                  <span>•</span>
                  <span>{fighter.record}</span>
                  {"streak" in fighter && fighter.streak ? (
                    <>
                      <span>•</span>
                      <span className="text-orange-400">🔥 {fighter.streak}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-yellow-400">{fighter.elo}</p>
                <p className="text-xs text-gray-500">ELO</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 p-5 text-center"
      >
        <p className="mb-2 font-bold text-white">🥊 Хочешь попасть в топ?</p>
        <p className="mb-4 text-sm text-gray-400">
          Создай паспорт бойца и начни свой путь
        </p>
        <button
          type="button"
          onClick={goAuth}
          className="w-full rounded-xl bg-yellow-400 py-3 font-bold text-black transition-all hover:bg-yellow-500"
        >
          Начать путь →
        </button>
      </motion.div>
    </div>
  );
}
