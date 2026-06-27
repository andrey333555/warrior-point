"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full rounded-[20px] p-8"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "0.5px solid rgba(255,255,255,0.1)",
      }}
    >
      {children}
    </motion.div>
  );
}
