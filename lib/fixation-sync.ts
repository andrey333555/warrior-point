"use client";

/**
 * Sync confirmed fixation sessions to Supabase when online.
 * Proof is re-verified server-side before XP is persisted.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { advanceFighterXp, recordTrainingSessionRub } from "@/lib/economy";
import { getXp } from "@/lib/xp";
import {
  getAwaitingSyncSessions,
  markSessionRejected,
  markSessionSynced,
  validateFixationForSync,
  type FixationSession,
} from "@/lib/session-fixation";
import { applyCheckInRewards } from "@/lib/check-in-rewards";
import { resolveTrainerCheckInSite } from "@/lib/verify";

export type FixationSyncResult = {
  synced: number;
  rejected: number;
  errors: string[];
};

function toVerifyDetails(session: FixationSession): string {
  const method = session.confirmMethod ?? "manual_code";
  const labels: Record<string, string> = {
    qr_offline: "📱 QR offline",
    bluetooth: "📡 Bluetooth",
    manual_code: "🔢 Код тренера",
  };
  return `${labels[method] ?? method} · key ${session.sessionKey}`;
}

async function postFixationToServer(
  session: FixationSession,
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/fixation/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
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

/**
 * Flush all confirmed-but-unsynced fixation sessions.
 * Only system-verified sessions reach XP / rating / history.
 */
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

    const economics = recordTrainingSessionRub(session.grossRub);
    const advancement = advanceFighterXp(getXp().total, economics.xpAward);

    const site = resolveTrainerCheckInSite(session.trainerId);
    applyCheckInRewards(site, 0, {
      method: session.verifyMethod ?? "code",
      confidence: "high",
      details: toVerifyDetails(session),
    });

    const { error } = await postFixationToServer(session);

    if (error) {
      errors.push(`${session.sessionKey}: ${error.message}`);
      continue;
    }

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
