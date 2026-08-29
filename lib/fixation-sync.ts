"use client";

/**
 * Sync confirmed fixation sessions to Supabase when online.
 * Proof is re-verified server-side before XP is persisted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { addBooking } from "@/lib/bookings";
import {
  getAwaitingSyncSessions,
  markSessionRejected,
  markSessionSynced,
  validateFixationForSync,
  type FixationSession,
} from "@/lib/session-fixation";
import { resolveTrainerCheckInSite } from "@/lib/verify";

export type FixationSyncResult = {
  synced: number;
  rejected: number;
  errors: string[];
};

async function postFixationToServer(
  session: FixationSession,
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/fixation/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session,
        paymentId: session.paymentId,
      }),
    });

    if (res.ok) return { error: null };

    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return {
      error: new Error(data?.message ?? `Fixation sync failed (${res.status})`),
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Fixation sync network error"),
    };
  }
}

export async function syncConfirmedFixations(
  _client: SupabaseClient,
  fighterId: string,
): Promise<FixationSyncResult> {
  const pending = getAwaitingSyncSessions().filter(
    (s) => s.fighterId === fighterId,
  );

  let synced = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const session of pending) {
    const validation = validateFixationForSync(session);
    if (!validation.valid) {
      markSessionRejected(session.sessionKey, validation.errors.join(" · "));
      rejected++;
      errors.push(`${session.sessionKey}: ${validation.errors.join(", ")}`);
      continue;
    }

    const { error } = await postFixationToServer(session);

    if (error) {
      errors.push(`${session.sessionKey}: ${error.message}`);
      continue;
    }

    const site = resolveTrainerCheckInSite(session.trainerId);
    addBooking({
      trainerId: site.trainerIdNum,
      trainerName: site.trainerName,
      gymName: site.gymName,
      date: "Сегодня",
      time: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "split",
    });

    markSessionSynced(session.sessionKey);
    synced++;
  }

  return { synced, rejected, errors };
}

export function fixationAwaitingCount(fighterId?: string): number {
  const all = getAwaitingSyncSessions();
  if (!fighterId) return all.length;
  return all.filter((s) => s.fighterId === fighterId).length;
}
