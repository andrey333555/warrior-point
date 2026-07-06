"use client";

import { useAuthForm } from "@/components/auth/context";
import { WarriorLogo } from "@/components/warrior-logo";

export function Header() {
  const { mode } = useAuthForm();

  return (
    <div className="mb-8 text-center">
      <div className="mb-6 flex items-center justify-center gap-2">
        <WarriorLogo size="sm" />
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
