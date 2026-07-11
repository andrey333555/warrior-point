import { createHmac, timingSafeEqual } from "node:crypto";

/** initData older than this is rejected (replay protection). */
const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

export type TelegramVerifyResult =
  | { ok: true }
  | { ok: false; reason: "NO_BOT_TOKEN" | "NO_HASH" | "BAD_HASH" | "EXPIRED" };

/**
 * Verify Telegram Mini App `initData` per the official spec:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 *   secret_key   = HMAC_SHA256(bot_token, key = "WebAppData")
 *   check_string = sorted "key=value" pairs (без hash), joined with "\n"
 *   valid        ⇔ HMAC_SHA256(check_string, secret_key) == hash
 */
export function verifyTelegramInitData(initData: string): TelegramVerifyResult {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return { ok: false, reason: "NO_BOT_TOKEN" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "NO_HASH" };

  params.delete("hash");
  const checkString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(checkString).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "BAD_HASH" };
  }

  const authDate = Number(params.get("auth_date"));
  if (
    !Number.isFinite(authDate) ||
    Math.abs(Date.now() / 1000 - authDate) > MAX_INIT_DATA_AGE_SECONDS
  ) {
    return { ok: false, reason: "EXPIRED" };
  }

  return { ok: true };
}
