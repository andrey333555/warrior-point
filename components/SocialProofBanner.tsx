"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Flame, TrendingUp } from "lucide-react";

export default function SocialProofBanner() {
  const [data, setData] = useState({
    totalFighters: 5231,
    matchesToday: 187,
    onlineNow: 342,
  });

  useEffect(() => {
    const fetchStats = () => {
      setData((prev) => ({
        totalFighters: prev.totalFighters + Math.floor(Math.random() * 3),
        matchesToday: prev.matchesToday + Math.floor(Math.random() * 2),
        onlineNow: 300 + Math.floor(Math.random() * 100),
      }));
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto mb-4 w-full max-w-md px-4"
    >
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-r from-gray-900/80 to-gray-800/80 p-3 backdrop-blur-md">
        <div className="flex items-center justify-around gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">
                {data.totalFighters.toLocaleString("ru-RU")}
              </span>
            </div>
            <span className="text-xs text-gray-500">бойцов</span>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-orange-400" />
              <span className="text-sm font-bold text-white">
                {data.matchesToday}
              </span>
            </div>
            <span className="text-xs text-gray-500">боёв сегодня</span>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-sm font-bold text-white">
                {data.onlineNow}
              </span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            </div>
            <span className="text-xs text-gray-500">онлайн</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
