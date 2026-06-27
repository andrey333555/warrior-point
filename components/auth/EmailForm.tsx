"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuthForm } from "@/components/auth/context";

const INPUT_CLASS =
  "w-full rounded-[10px] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#C9A84C]/40";

const INPUT_STYLE = {
  background: "rgba(255,255,255,0.05)",
  border: "0.5px solid rgba(255,255,255,0.1)",
};

export function EmailForm() {
  const {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    submit,
  } = useAuthForm();

  return (
    <div className="mb-5 flex flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {mode === "register" ? (
          <motion.input
            key="full-name"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            type="text"
            placeholder="Полное имя"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        ) : null}
      </AnimatePresence>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
        className={INPUT_CLASS}
        style={INPUT_STYLE}
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
        className={INPUT_CLASS}
        style={INPUT_STYLE}
      />
    </div>
  );
}
