"use client";

import { motion } from "framer-motion";
import { Users, Eye, DollarSign } from "lucide-react";

interface FighterSocialProofProps {
  fans: number;
  totalRaised: number;
  views: number;
}

export default function FighterSocialProof({
  fans,
  totalRaised,
  views,
}: FighterSocialProofProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 flex items-center gap-4 text-xs text-gray-400"
    >
      <div className="flex items-center gap-1.5">
        <Users size={12} className="text-yellow-400" />
        <span className="font-bold text-white">
          {fans.toLocaleString("ru-RU")}
        </span>
        <span>фанатов</span>
      </div>
      <span className="text-gray-600">·</span>
      <div className="flex items-center gap-1.5">
        <DollarSign size={12} className="text-green-400" />
        <span className="font-bold text-white">
          {totalRaised.toLocaleString("ru-RU")} ₽
        </span>
        <span>собрано</span>
      </div>
      <span className="text-gray-600">·</span>
      <div className="flex items-center gap-1.5">
        <Eye size={12} className="text-blue-400" />
        <span className="font-bold text-white">
          {views.toLocaleString("ru-RU")}
        </span>
        <span>просмотров</span>
      </div>
    </motion.div>
  );
}
