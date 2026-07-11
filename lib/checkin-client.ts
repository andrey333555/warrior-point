"use client";

import {
  createTrainerCodeSession,
  verifyTrainerCode,
  type TrainerCodeSession,
} from "@/lib/verify";

export type CheckInCodeSource = "server" | "local";

export type TrainerCodeView = TrainerCodeSession & {
  source: CheckInCodeSource;
};

/**
 * Trainer's rotating code for display. Prefers the server-secret code
 * (/api/checkin/code); falls back to the local demo hash when the secret
 * isn't configured or the network is down.
 */
export async function fetchTrainerCodeSession(
  trainerId: string,
): Promise<TrainerCodeView> {
  try {
    const res = await fetch(
      `/api/checkin/code?trainerId=${encodeURIComponent(trainerId)}`,
    );
    const data = (await res.json()) as {
      ok?: boolean;
      configured?: boolean;
      code?: string;
      displayCode?: string;
      slot?: number;
      expiresInMs?: number;
    };

    if (res.ok && data.ok && data.configured && data.code) {
      const expiresInMs = data.expiresInMs ?? 0;
      return {
        code: data.code,
        displayCode: data.displayCode ?? data.code,
        slot: data.slot ?? 0,
        expiresInMs,
        expiresAt: Date.now() + expiresInMs,
        source: "server",
      };
    }
  } catch {
    // offline / server down — demo fallback below
  }

  return { ...createTrainerCodeSession(trainerId), source: "local" };
}

/**
 * Verify a fighter-entered code. Server-secret check first; only when the
 * secret isn't configured (demo) does the legacy local hash count.
 */
export async function verifyCheckInCode(
  trainerId: string,
  code: string,
): Promise<{ valid: boolean; source: CheckInCodeSource }> {
  try {
    const res = await fetch("/api/checkin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId, code }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      configured?: boolean;
      valid?: boolean;
    };

    if (res.ok && data.ok && data.configured) {
      return { valid: !!data.valid, source: "server" };
    }
  } catch {
    // offline — demo fallback below
  }

  return { valid: verifyTrainerCode(trainerId, code), source: "local" };
}
