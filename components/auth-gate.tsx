"use client";

import { motion } from "framer-motion";
import { AuthView } from "@/components/auth/AuthView";

export function AuthGate() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A]">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-blue-500/20 blur-xl"
        />
      </div>

      <AuthView />
    </main>
  );
}
