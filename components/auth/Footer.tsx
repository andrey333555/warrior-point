"use client";

import { useAuthForm } from "@/components/auth/context";

export function Footer() {
  const { mode, toggleMode } = useAuthForm();

  return (
    <p className="mt-5 text-center text-xs text-white/30">
      {mode === "login" ? "Нет аккаунта?" : "Уже есть профиль?"}{" "}
      <button
        type="button"
        onClick={toggleMode}
        className="cursor-pointer text-[#C9A84C] transition-opacity hover:opacity-80"
      >
        {mode === "login" ? "Зарегистрироваться" : "Войти"}
      </button>
    </p>
  );
}
