type CspOptions = {
  isDev: boolean;
  nonce?: string;
};

function scriptSrc({ isDev, nonce }: CspOptions): string {
  if (isDev) {
    // Хеш/nonce в dev глушит 'unsafe-inline' — Turbopack остаётся с пустой оболочкой.
    return "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://telegram.org";
  }
  if (nonce) {
    return `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://telegram.org`;
  }
  // Без nonce инлайн Next (__next_f) не выполнится — лучше ослабить, чем чёрный экран.
  return "script-src 'self' 'unsafe-inline' https://telegram.org";
}

function connectSrc(isDev: boolean): string {
  const prod =
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.yookassa.ru https://telegram.org https://oauth.yandex.ru https://api.vk.com https://accounts.google.com";
  if (!isDev) return prod;
  return `${prod} ws: wss: http://127.0.0.1:* http://localhost:*`;
}

export function contentSecurityPolicy(opts: CspOptions): string {
  const { isDev } = opts;
  return [
    "default-src 'self'",
    scriptSrc(opts),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    connectSrc(isDev),
    "frame-src 'self' https://*.yookassa.ru https://yoomoney.ru",
    isDev ? "frame-ancestors *" : "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
