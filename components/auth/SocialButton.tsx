"use client";

import { signIn } from "next-auth/react";
import { SOCIAL_LABELS, type SocialIcon } from "@/components/auth/types";

export function SocialButton({ icon }: { icon: SocialIcon }) {
  return (
    <button
      type="button"
      onClick={() => signIn(icon)}
      className="
        flex w-full items-center gap-3
        rounded-xl px-4 py-3
        border border-white/10 bg-white/[0.04]
        text-sm text-white/80
        transition
        hover:border-white/20 hover:bg-white/[0.08]
        active:scale-[0.98]
      "
    >
      {icon === "google" && <GoogleIcon />}
      {icon === "apple" && <AppleIcon />}
      {icon === "yandex" && <YandexIcon />}
      {icon === "vk" && <VkIcon />}
      {icon === "sber" && <SberIcon />}
      {SOCIAL_LABELS[icon]}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function YandexIcon() {
  return (
    <div className="text-sm font-bold text-white" aria-hidden>
      Я
    </div>
  );
}

function VkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
      <path d="M12.785 16.241s.288-.032.436-.194c.136-.149.132-.429.132-.429s-.019-1.31.584-1.504c.594-.192 1.356 1.266 2.165 1.825.612.425 1.076.332 1.076.332l2.163-.03s1.132-.07.595-.96c-.044-.073-.313-.658-1.61-1.86-1.356-1.255-1.175-1.052.459-3.221.996-1.32 1.394-2.124 1.27-2.47-.118-.33-.845-.242-.845-.242l-2.434.015s-.18-.025-.312.055c-.13.08-.214.265-.214.265s-.385 1.02-.897 1.887c-1.08 1.83-1.512 1.927-1.688 1.813-.41-.265-.307-1.064-.307-1.633 0-1.776.27-2.517-.527-2.709-.264-.064-.458-.106-1.133-.113-.866-.009-1.6.002-2.014.204-.275.134-.487.432-.357.45.161.022.527.1.72.363.25.34.241 1.103.241 1.103s.142 2.09-.331 2.35c-.325.18-.771-.187-1.73-1.844-.49-.847-.86-1.786-.86-1.786s-.071-.177-.198-.273c-.153-.116-.367-.154-.367-.154l-2.313.015s-.347.01-.474.16c-.113.133-.01.408-.01.408s1.81 4.233 3.86 6.36c1.88 1.947 4.013 1.82 4.013 1.82h.967z" />
    </svg>
  );
}

function SberIcon() {
  return (
    <div
      className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/60 text-[10px]"
      aria-hidden
    >
      S
    </div>
  );
}
