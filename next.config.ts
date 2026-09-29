import type { NextConfig } from "next";
import path from "node:path";
import { contentSecurityPolicy } from "./lib/csp";

const projectRoot = path.resolve(process.cwd());
const isDev = process.env.NODE_ENV !== "production";

/** Dev: allow Cursor/browser preview iframes. Prod stays locked down. */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  ...(isDev
    ? []
    : [{ key: "X-Frame-Options", value: "DENY" }]),
  // Prod CSP живёт в proxy.ts (nonce на каждый запрос). Хеш темы здесь
  // глушил инлайн Next и оставлял чёрный экран на Vercel.
  ...(isDev
    ? [
        {
          key: "Content-Security-Policy",
          value: contentSecurityPolicy({ isDev: true }),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Next 16.3 + Vercel adapter: standalone больше не пишет
  // .next/next-server.js.nft.json, а Vercel onBuildComplete его открывает → ENOENT.
  // На Vercel standalone и так игнорируется. Для Docker / self-host оставляем.
  output: process.env.VERCEL ? undefined : "standalone",
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
