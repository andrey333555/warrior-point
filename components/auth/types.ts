export type AuthMode = "login" | "register";

export type SocialIcon = "google" | "apple" | "yandex" | "vk" | "sber";

export type AuthEcho = {
  tone: "ok" | "err";
  text: string;
};

export const AUTH_GOLD = "#C9A84C";

export const SOCIAL_LABELS: Record<SocialIcon, string> = {
  yandex: "Яндекс",
  vk: "VK",
  sber: "Сбер",
  google: "Google",
  apple: "Apple",
};
