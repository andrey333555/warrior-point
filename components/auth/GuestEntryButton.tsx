"use client";

import { activateGuestMode } from "@/hooks/use-warrior-auth";

export function GuestEntryButton() {
  return (
    <button
      type="button"
      onClick={activateGuestMode}
      className="group mt-5 w-full rounded-xl border border-[#C9A84C]/45 bg-[#C9A84C]/10 px-4 py-3.5 text-sm font-semibold text-[#C9A84C] shadow-[0_0_24px_-8px_rgba(201,168,76,0.45)] transition hover:border-[#C9A84C]/70 hover:bg-[#C9A84C]/15 hover:text-[#e8d08a]"
    >
      <div className="flex items-center justify-between gap-2">
        <span>Войти как гость · без регистрации</span>
        <span className="opacity-60 transition group-hover:translate-x-0.5">→</span>
      </div>
      <p className="mt-1 text-left text-[10px] font-normal text-white/35">
        Демо-паспорт бойца · донаты · лента · карты
      </p>
    </button>
  );
}

/** @deprecated use GuestEntryButton */
export const DemoButton = GuestEntryButton;
