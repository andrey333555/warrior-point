"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AUTH_GOLD } from "@/components/auth/types";
import { useAuthForm } from "@/components/auth/context";

export function SubmitButton() {
  const { mode, busy, email, password, submit, echo } = useAuthForm();

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        disabled={busy || !email || !password}
        onClick={() => void submit()}
        className="relative w-full overflow-hidden rounded-[12px] py-3 text-sm font-medium text-[#0A0A0A] transition-opacity disabled:opacity-45"
        style={{ background: AUTH_GOLD }}
      >
        <span className="relative z-10">
          {busy ? "…" : mode === "login" ? "Продолжить" : "Зарегистрироваться"}
        </span>
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)",
          }}
        />
      </motion.button>

      <AnimatePresence>
        {echo ? (
          <motion.p
            key={echo.text}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 rounded-[10px] px-3 py-2 text-center text-xs ${
              echo.tone === "ok" ? "text-emerald-300/90" : "text-rose-300/90"
            }`}
            style={{
              background:
                echo.tone === "ok"
                  ? "rgba(52,211,153,0.08)"
                  : "rgba(244,63,94,0.08)",
              border: "0.5px solid rgba(255,255,255,0.08)",
            }}
          >
            {echo.text}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </>
  );
}
