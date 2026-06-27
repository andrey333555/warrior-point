"use client";

import { motion } from "framer-motion";
import { activateDevBypass } from "@/hooks/use-warrior-auth";
import { AUTH_GOLD } from "@/components/auth/types";
import { AuthView } from "@/components/auth/AuthView";

export function AuthGate() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A]">
      {process.env.NODE_ENV === "development" && (
        <button
          type="button"
          onClick={activateDevBypass}
          title="Dev bypass · демо-профиль без пароля"
          aria-label="Режим разработчика"
          className="fixed right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 opacity-40 transition-opacity hover:opacity-100"
        >
          <svg viewBox="0 0 20 20" width={14} height={14} fill="none" aria-hidden>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-1.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
              fill={AUTH_GOLD}
            />
            <path
              d="M10 2a1 1 0 0 1 .97.757l.35 1.395a5.98 5.98 0 0 1 1.21.7l1.367-.46a1 1 0 0 1 1.18.46l1 1.732a1 1 0 0 1-.23 1.27l-1.1.916a6.06 6.06 0 0 1 0 1.46l1.1.916a1 1 0 0 1 .23 1.27l-1 1.732a1 1 0 0 1-1.18.46l-1.368-.46a5.98 5.98 0 0 1-1.21.7L10.97 17.243A1 1 0 0 1 9.03 17.243l-.35-1.395a5.98 5.98 0 0 1-1.21-.7l-1.367.46a1 1 0 0 1-1.18-.46l-1-1.732a1 1 0 0 1 .23-1.27l1.1-.916a6.06 6.06 0 0 1 0-1.46l-1.1-.916a1 1 0 0 1-.23-1.27l1-1.732a1 1 0 0 1 1.18-.46l1.368.46a5.98 5.98 0 0 1 1.21-.7L9.03 2.757A1 1 0 0 1 10 2Z"
              fill="rgba(201,168,76,0.45)"
            />
          </svg>
        </button>
      )}

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
