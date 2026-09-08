import type { NextConfig } from "next";
import path from "node:path";
import { themeBootstrapCspHash } from "./lib/theme-bootstrap";

const projectRoot = path.resolve(process.cwd());
const themeHash = themeBootstrapCspHash();
const isDev = process.env.NODE_ENV !== "production";

// Dev: do NOT include a script hash — browsers ignore 'unsafe-inline' when any
// hash/nonce is present, which blocks Next/Turbopack inline bootstrap and leaves
// the UI stuck on an empty shell (nav only / «Загрузка…»).
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://telegram.org"
  : `script-src 'self' ${themeHash} https://telegram.org`;

const connectSrc = isDev
  ? "connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:* https://*.supabase.co wss://*.supabase.co https://api.yookassa.ru https://telegram.org https://oauth.yandex.ru https://api.vk.com https://accounts.google.com"
  : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.yookassa.ru https://telegram.org https://oauth.yandex.ru https://api.vk.com https://accounts.google.com";

/** Dev: allow Cursor/browser preview iframes. Prod stays locked down. */
const frameAncestors = isDev ? "frame-ancestors *" : "frame-ancestors 'none'";

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
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      connectSrc,
      "frame-src 'self' https://*.yookassa.ru https://yoomoney.ru",
      frameAncestors,
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
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
