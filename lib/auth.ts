import type { NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { verifyTelegramInitData } from "@/lib/telegram-verify";

type YandexProfile = {
  id: string;
  real_name?: string;
  login?: string;
  default_email?: string;
  default_avatar_id?: string;
};

type VkTokenProfile = {
  email?: string;
};

type VkUser = {
  id: number;
  first_name: string;
  last_name: string;
  photo_200?: string;
};

type SberProfile = {
  sub: string;
  name?: string;
  email?: string;
};

const yandexProvider: OAuthConfig<YandexProfile> = {
  id: "yandex",
  name: "Yandex",
  type: "oauth",
  authorization: "https://oauth.yandex.ru/authorize",
  token: "https://oauth.yandex.ru/token",
  userinfo: "https://login.yandex.ru/info?format=json",
  clientId: process.env.YANDEX_CLIENT_ID ?? "",
  clientSecret: process.env.YANDEX_CLIENT_SECRET ?? "",
  profile(profile) {
    return {
      id: profile.id,
      name: profile.real_name || profile.login,
      email: profile.default_email,
      image: profile.default_avatar_id
        ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
        : null,
    };
  },
};

const vkProvider: OAuthConfig<VkTokenProfile> = {
  id: "vk",
  name: "VK",
  type: "oauth",
  authorization: {
    url: "https://oauth.vk.com/authorize",
    params: { scope: "email", v: "5.131" },
  },
  token: "https://oauth.vk.com/access_token",
  userinfo: {
    async request({ tokens }) {
      const url = new URL("https://api.vk.com/method/users.get");
      url.searchParams.set("access_token", tokens.access_token!);
      url.searchParams.set("fields", "photo_200");
      url.searchParams.set("v", "5.131");
      const res = await fetch(url);
      return res.json();
    },
  },
  clientId: process.env.VK_CLIENT_ID ?? "",
  clientSecret: process.env.VK_CLIENT_SECRET ?? "",
  profile(profile, tokens) {
    const user = (profile as { response?: VkUser[] }).response?.[0];
    if (!user) {
      throw new Error("VK profile fetch failed");
    }
    return {
      id: String(user.id),
      name: `${user.first_name} ${user.last_name}`,
      email: (tokens as VkTokenProfile).email ?? null,
      image: user.photo_200 ?? null,
    };
  },
};

const sberProvider: OAuthConfig<SberProfile> = {
  id: "sber",
  name: "Sber ID",
  type: "oauth",
  authorization: {
    url: "https://online.sberbank.ru/CSAFront/oidc/authorize.do",
    params: { scope: "openid name email" },
  },
  token: "https://online.sberbank.ru/CSAFront/api/service/oidc/v3/token",
  userinfo: "https://online.sberbank.ru/CSAFront/api/service/oidc/v3/userinfo",
  clientId: process.env.SBER_CLIENT_ID ?? "",
  clientSecret: process.env.SBER_CLIENT_SECRET ?? "",
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email ?? null,
      image: null,
    };
  },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {
        initData: { label: "Init Data", type: "text" },
      },
      async authorize(credentials) {
        const initData = credentials?.initData;
        if (!initData) return null;

        // HMAC check per Telegram Mini App spec — without it anyone could
        // craft initData and log in as an arbitrary Telegram user.
        const verification = verifyTelegramInitData(initData);
        if (!verification.ok) {
          console.warn(`[auth] telegram initData rejected: ${verification.reason}`);
          return null;
        }

        const params = new URLSearchParams(initData);
        const userJson = params.get("user");
        if (!userJson) return null;

        try {
          const user = JSON.parse(userJson) as {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
          const name =
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.username ||
            "Telegram User";
          return {
            id: String(user.id),
            name,
            email: null,
            image: user.photo_url ?? null,
          };
        } catch {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID ?? "",
      clientSecret: process.env.APPLE_SECRET ?? "",
    }),
    yandexProvider,
    vkProvider,
    sberProvider,
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
