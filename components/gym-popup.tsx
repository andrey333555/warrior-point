"use client";

/**
 * GymPopup — IRON WILL · Stitch vertical bottom sheet.
 */

import { motion } from "framer-motion";
import type { GymEntry } from "@/lib/gyms";
import { GYM_ACCENT_HEX } from "@/lib/gyms";
import { GymDetailBody } from "@/components/gym-detail-body";

type GymPopupProps = {
  gym: GymEntry;
  onClose: () => void;
  clientId?: string;
  onBooked?: (msg: string) => void;
};

export function GymPopup({ gym, onClose, clientId, onBooked }: GymPopupProps) {
  const hexColor = GYM_ACCENT_HEX[gym.accent];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[1050] bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute inset-x-0 bottom-0 z-[1100] max-h-[82%] overflow-hidden rounded-t-3xl border border-white/[0.1] bg-zinc-950/98 shadow-[0_-24px_80px_rgba(0,0,0,0.85)]"
        style={{
          boxShadow: `0 -8px 60px -12px ${hexColor}55, 0 -24px 80px rgba(0,0,0,0.85)`,
        }}
      >
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <GymDetailBody gym={gym} clientId={clientId} onClose={onClose} onBooked={onBooked} />
        </div>
      </motion.div>
    </>
  );
}
