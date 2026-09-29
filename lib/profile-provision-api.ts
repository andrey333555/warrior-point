"use client";

import type { WarriorCalibration } from "@/lib/calibration";

/**
 * Provision profiles/fighter_stats through the server route
 * (`/api/auth/provision`) — the server verifies the Supabase access token
 * itself and reads the user id out of that, never out of a client claim.
 *
 * Called from a single place: the SIGNED_IN handler in
 * `hooks/use-warrior-auth.ts`'s `onAuthStateChange` listener — that fires
 * for every real sign-in (login form, sign-up with an immediate session,
 * *and* the email-confirmation redirect landing back on the app, which
 * bypasses the login form entirely). The route itself is idempotent — an
 * existing profile is left untouched — so calling this on every SIGNED_IN
 * is cheap.
 *
 * `calibration` here is only the localStorage fallback for pre-existing
 * sign-ups whose `user_metadata` doesn't carry it yet — new sign-ups store
 * calibration in `user_metadata` at `signUp()` time, which the route reads
 * directly (durable, not device-bound).
 */
export async function provisionOwnProfile(
  accessToken: string,
  fallbackCalibration?: WarriorCalibration,
): Promise<void> {
  try {
    await fetch("/api/auth/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        calibration: fallbackCalibration
          ? {
              skillTier: fallbackCalibration.skillTier,
              record: fallbackCalibration.record,
              startingElo: fallbackCalibration.startingElo,
              verified: fallbackCalibration.verifiedFighter,
            }
          : undefined,
      }),
    });
  } catch (err) {
    console.warn("[provision] request failed:", err);
  }
}
