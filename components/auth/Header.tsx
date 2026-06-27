"use client";

import { AUTH_GOLD } from "@/components/auth/types";
import { useAuthForm } from "@/components/auth/context";

export function Header() {
  const { mode } = useAuthForm();

  return (
    <div className="mb-8 text-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <WarriorHexLogo />
        <span className="text-lg font-medium tracking-widest text-white">
          WARRIOR POINT
        </span>
      </div>
      <h1 className="mb-1 text-2xl font-medium text-white">
        {mode === "login" ? "Добро пожаловать" : "Создать профиль"}
      </h1>
      <p className="text-sm text-white/40">
        {mode === "login"
          ? "Войди в свой боевой профиль"
          : "Регистрация бойца · глобальный паспорт"}
      </p>
    </div>
  );
}

function WarriorHexLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <polygon
        points="14,2 26,8 26,20 14,26 2,20 2,8"
        stroke={AUTH_GOLD}
        strokeWidth="1.5"
        fill="none"
      />
      <polygon
        points="14,7 21,11 21,17 14,21 7,17 7,11"
        stroke={AUTH_GOLD}
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
