"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createWarriorBrowserClient } from "@/lib/supabase/client";
import { provisionNewWarrior } from "@/lib/supabase/provision-user";
import { activateDevBypass } from "@/hooks/use-warrior-auth";

type Mode = "login" | "register";

export function AuthGate() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [echo, setEcho] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit() {
    if (!email || !password) return;
    setBusy(true);
    setEcho(null);

    const client = createWarriorBrowserClient();
    if (!client) {
      setEcho({ tone: "err", text: "Supabase не подключён" });
      setBusy(false);
      return;
    }

    if (mode === "login") {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) setEcho({ tone: "err", text: "Неверный email или пароль" });
    } else {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setEcho({ tone: "err", text: error.message });
      } else {
        // Auto-provision profiles + fighter_stats for brand-new warriors
        if (data.user) {
          const { error: provErr } = await provisionNewWarrior(
            client,
            data.user.id,
            fullName || email.split("@")[0],
          );
          if (provErr) {
            console.warn("[AuthGate] provision warning:", provErr.message);
          }
        }
        if (!data.session) {
          setEcho({ tone: "ok", text: "Проверь email — письмо с подтверждением отправлено" });
        }
      }
    }

    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#080810] px-5">

      {/* ── Dev bypass button — visible only in development ── */}
      {process.env.NODE_ENV === "development" && (
        <button
          type="button"
          onClick={activateDevBypass}
          title="Dev bypass · загрузить демо-профиль без пароля"
          aria-label="Режим разработчика"
          className="group fixed right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/20 bg-black/50 opacity-30 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/60 hover:opacity-100"
          style={{ boxShadow: "0 0 0 0 rgba(0,240,255,0)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 14px -2px rgba(0,240,255,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 0 0 0 rgba(0,240,255,0)";
          }}
        >
          {/* Gear SVG */}
          <svg viewBox="0 0 20 20" width={14} height={14} fill="none" aria-hidden>
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-1.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
              fill="rgba(0,240,255,0.8)"
            />
            <path
              d="M10 2a1 1 0 0 1 .97.757l.35 1.395a5.98 5.98 0 0 1 1.21.7l1.367-.46a1 1 0 0 1 1.18.46l1 1.732a1 1 0 0 1-.23 1.27l-1.1.916a6.06 6.06 0 0 1 0 1.46l1.1.916a1 1 0 0 1 .23 1.27l-1 1.732a1 1 0 0 1-1.18.46l-1.368-.46a5.98 5.98 0 0 1-1.21.7L10.97 17.243A1 1 0 0 1 9.03 17.243l-.35-1.395a5.98 5.98 0 0 1-1.21-.7l-1.367.46a1 1 0 0 1-1.18-.46l-1-1.732a1 1 0 0 1 .23-1.27l1.1-.916a6.06 6.06 0 0 1 0-1.46l-1.1-.916a1 1 0 0 1-.23-1.27l1-1.732a1 1 0 0 1 1.18-.46l1.368.46a5.98 5.98 0 0 1 1.21-.7L9.03 2.757A1 1 0 0 1 10 2Z"
              fill="rgba(0,240,255,0.4)"
            />
          </svg>
          {/* Tooltip */}
          <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-cyan-400/30 bg-black/90 px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.2em] text-cyan-300 opacity-0 transition-opacity group-hover:opacity-100">
            Dev · Demo
          </span>
        </button>
      )}

      {/* Cyber-Loft ambient grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.7) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-cyan-500/[0.06] via-transparent to-fuchsia-500/[0.06]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-white/[0.1] bg-black/80 p-8 shadow-[0_0_80px_-20px_rgba(34,211,238,0.35)] backdrop-blur-xl"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.42em] text-cyan-400/80">
            Warrior Point
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {mode === "login" ? "Вход в систему" : "Регистрация бойца"}
          </h1>
        </div>

        {/* Mode switcher */}
        <div className="mb-6 flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setEcho(null); }}
              className={`flex-1 rounded-lg py-2 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.22em] transition-all duration-200 ${
                mode === m
                  ? "bg-cyan-500/20 text-cyan-200 shadow-[0_0_14px_-4px_rgba(34,211,238,0.6)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {m === "login" ? "Вход" : "Создать"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {mode === "register" && (
              <motion.div
                key="full-name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <input
                  type="text"
                  placeholder="Полное имя"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 font-[family-name:var(--font-geist-mono)] text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-500/50 focus:bg-white/[0.06]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 font-[family-name:var(--font-geist-mono)] text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-500/50 focus:bg-white/[0.06]"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 font-[family-name:var(--font-geist-mono)] text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-500/50 focus:bg-white/[0.06]"
          />
        </div>

        {/* Submit */}
        <motion.button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy || !email || !password}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.012 }}
          className="mt-5 w-full rounded-full border border-cyan-400/45 bg-black/70 py-3 font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100 shadow-[0_0_28px_-10px_rgba(34,211,238,0.55)] transition-opacity disabled:pointer-events-none disabled:opacity-40"
        >
          {busy ? "…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
        </motion.button>

        {/* Echo */}
        <AnimatePresence>
          {echo && (
            <motion.p
              key={echo.text}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`mt-4 rounded-xl px-4 py-2.5 text-center font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.2em] ${
                echo.tone === "ok"
                  ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border border-red-400/30 bg-red-500/10 text-red-300"
              }`}
            >
              {echo.text}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Neon bottom glow strip */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)" }}
        />
      </motion.div>

      <p className="relative z-10 mt-6 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.28em] text-zinc-600">
        Warrior Point · Sovereign ledger
      </p>
    </div>
  );
}
