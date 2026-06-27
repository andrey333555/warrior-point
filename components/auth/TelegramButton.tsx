"use client";

import { signIn } from "next-auth/react";
import { useIsTelegram } from "@/components/telegram-theme";

export function TelegramButton({
  onClick,
  onError,
}: {
  onClick?: () => void;
  onError?: (message: string) => void;
}) {
  const isTelegram = useIsTelegram();

  function handleClick() {
    if (onClick) {
      onClick();
      return;
    }

    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      void signIn("telegram", { initData, callbackUrl: "/" });
      return;
    }
    if (isTelegram) {
      onError?.("Telegram auth недоступен · перезапусти Mini App");
      return;
    }
    onError?.("Открой Warrior Point через Telegram Mini App");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        group relative w-full overflow-hidden
        rounded-2xl px-5 py-3.5
        bg-gradient-to-b from-white/10 to-white/[0.02]
        backdrop-blur-2xl
        border border-white/10
        shadow-[0_8px_30px_rgba(0,0,0,0.35)]
        animate-[pulse_3s_ease-in-out_infinite]
        transition-all duration-300 ease-out

        hover:scale-[1.02]
        hover:shadow-[0_0_40px_rgba(59,169,255,0.6)]
        hover:border-white/20
        hover:translate-y-[-1px]
        active:scale-[0.98]

        after:pointer-events-none after:absolute after:inset-0 after:content-['']
        after:bg-[url('/noise.png')] after:opacity-[0.03]
      "
    >
      <div
        className="
          pointer-events-none absolute inset-0
          bg-[radial-gradient(circle_at_50%_0%,rgba(59,169,255,0.15),transparent_60%)]
        "
      />

      <div
        className="
          absolute inset-0
          bg-gradient-to-r from-sky-500/0 via-sky-400/10 to-sky-500/0
          opacity-0 group-hover:opacity-100
          transition duration-500
        "
      />

      <div
        className="
          absolute -top-1/2 left-[-50%] h-[200%] w-[200%]
          bg-gradient-to-tr from-white/0 via-white/20 to-white/0
          rotate-12 translate-x-[-100%]
          group-hover:translate-x-[100%]
          transition duration-700 ease-out
        "
      />

      <div className="relative z-10 flex items-center justify-center gap-2">
        <svg
          className="h-5 w-5 text-white/80 transition group-hover:text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M9.04 15.47l-.39 5.46c.56 0 .8-.24 1.09-.53l2.62-2.5 5.43 3.97c1 .55 1.7.26 1.95-.92l3.54-16.6.01-.01c.3-1.4-.5-1.94-1.47-1.58L1.4 9.4c-1.35.52-1.33 1.27-.23 1.61l5.6 1.75L19.4 5.6c.6-.36 1.14-.16.69.2" />
        </svg>

        <span
          className="
            text-[15px] font-medium tracking-wide
            text-white/90 transition
            group-hover:text-white
          "
        >
          Продолжить через Telegram
        </span>
      </div>
    </button>
  );
}
