import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FighterAdvancerResult,
  SettlementBreakdown,
  TrainingSessionEconomyResult,
} from "@/lib/economy";
import { PLATFORM_COMMISSION_PCT } from "@/lib/economy";

// ── Public types ──────────────────────────────────────────────────────────────

export type WarriorTrainingSyncPayload = {
  fighterId: string;
  economics: TrainingSessionEconomyResult;
  advancement: FighterAdvancerResult;
  /** Running monthly XP total to store (client maintains state, server records). */
  monthlyXpAfter?: number;
};

export type SyncResult =
  | { status: "synced" }
  | { status: "saved_offline"; pendingCount: number }
  | { status: "error"; error: Error };

// ── Offline queue — localStorage-backed ───────────────────────────────────────

const QUEUE_KEY = "wp_offline_sessions_v1";

/** A fully-computed session row ready to INSERT into training_sessions. */
export type QueuedSession = {
  /** Internal queue ID (timestamp + random). */
  queueId: string;
  /** ISO timestamp when queued (used for created_at when syncing). */
  queuedAt: string;
  fighter_id: string;
  gross_amount: number;
  commission_pct: number;
  commission: number;
  fee_amount: number;
  net_amount: number;
  xp_awarded: number;
  level_before: number;
  level_after: number;
  total_xp_after: number;
  levels_gained: number;
  monthly_xp_after: number;
  currency: string;
  synced: false;
};

function loadQueue(): QueuedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage quota exceeded — drop oldest entry and retry once
    try {
      const trimmed = queue.slice(-50);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up silently — app still works, session just won't persist offline
    }
  }
}

/** Append one session to the offline queue. Returns the updated pending count. */
export function enqueueOfflineSession(session: Omit<QueuedSession, "queueId" | "queuedAt" | "synced">): number {
  const queue = loadQueue();
  const entry: QueuedSession = {
    ...session,
    queueId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    queuedAt: new Date().toISOString(),
    synced: false,
  };
  queue.push(entry);
  saveQueue(queue);
  return queue.length;
}

/** How many sessions are waiting to be synced. */
export function offlinePendingCount(): number {
  return loadQueue().length;
}

/** Remove all successfully synced sessions from the queue. */
function clearSyncedSessions(syncedIds: Set<string>): void {
  const queue = loadQueue().filter((s) => !syncedIds.has(s.queueId));
  saveQueue(queue);
}

// ── Resilient Supabase helpers ─────────────────────────────────────────────────

/**
 * Resilient upsert for `fighter_stats`.
 * Strips unknown columns one-by-one and retries up to 8 times.
 */
async function upsertFighterStats(
  client: SupabaseClient,
  stats: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  let payload = { ...stats };

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await client
      .from("fighter_stats")
      .upsert(payload, { onConflict: "fighter_id" });

    if (!error) return { error: null };

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss) {
      const col = miss[1];
      if (col in payload) {
        const { [col]: _dropped, ...rest } = payload;
        payload = rest;
        continue;
      }
    }

    return { error: new Error(error.message) };
  }

  return { error: new Error("Too many missing columns in fighter_stats — run migration 0001+") };
}

/**
 * Resilient insert for `training_sessions`.
 * Strips unknown columns one-by-one and retries up to 12 times.
 */
async function insertTrainingSession(
  client: SupabaseClient,
  row: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  let payload = { ...row };

  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await client.from("training_sessions").insert(payload);

    if (!error) return { error: null };

    const miss = error.message.match(/Could not find the '([^']+)' column/);
    if (miss) {
      const col = miss[1];
      if (col in payload) {
        const { [col]: _dropped, ...rest } = payload;
        payload = rest;
        continue;
      }
    }

    return { error: new Error(error.message) };
  }

  return {
    error: new Error(
      "Too many missing columns in training_sessions. Run migration 0001.",
    ),
  };
}

// ── Offline queue flush ────────────────────────────────────────────────────────

export type FlushResult = {
  flushed: number;
  failed: number;
  remaining: number;
  errors: Error[];
};

/**
 * Flush all pending offline sessions to Supabase.
 *
 * Strategy:
 *   1. Load queue from localStorage.
 *   2. For each entry: INSERT into training_sessions + UPSERT fighter_stats.
 *   3. Track successes; remove them from the queue.
 *   4. Leave failed entries in the queue for the next flush attempt.
 */
export async function flushOfflineQueue(client: SupabaseClient): Promise<FlushResult> {
  const queue = loadQueue();
  if (!queue.length) return { flushed: 0, failed: 0, remaining: 0, errors: [] };

  const synced = new Set<string>();
  const errors: Error[] = [];

  for (const entry of queue) {
    // Build session row (strip internal queue fields)
    const sessionRow: Record<string, unknown> = {
      fighter_id: entry.fighter_id,
      gross_amount: entry.gross_amount,
      commission_pct: entry.commission_pct,
      commission: entry.commission,
      fee_amount: entry.fee_amount,
      net_amount: entry.net_amount,
      xp_awarded: entry.xp_awarded,
      level_before: entry.level_before,
      level_after: entry.level_after,
      total_xp_after: entry.total_xp_after,
      levels_gained: entry.levels_gained,
      currency: entry.currency,
      // Preserve the original queue timestamp as created_at so ordering is correct
      created_at: entry.queuedAt,
    };

    const { error: sessErr } = await insertTrainingSession(client, sessionRow);
    if (sessErr) {
      errors.push(new Error(`[${entry.queueId}] session insert: ${sessErr.message}`));
      continue;
    }

    // Update fighter stats after each successful insert
    const statsRow: Record<string, unknown> = {
      fighter_id: entry.fighter_id,
      total_xp: entry.total_xp_after,
      current_level: entry.level_after,
      monthly_xp: entry.monthly_xp_after,
      updated_at: new Date().toISOString(),
    };

    const { error: statsErr } = await upsertFighterStats(client, statsRow);
    if (statsErr) {
      // Stats upsert failed — session already inserted, mark as synced anyway
      // to avoid duplicate inserts on next flush; log the stats error.
      console.warn("[Warrior Point] offline flush: stats upsert failed", statsErr.message);
    }

    synced.add(entry.queueId);
  }

  clearSyncedSessions(synced);

  const remaining = loadQueue().length;
  return {
    flushed: synced.size,
    failed: errors.length,
    remaining,
    errors,
  };
}

// ── Main persist function ──────────────────────────────────────────────────────

/**
 * Persist a warrior training session.
 *
 * Online path:   INSERT training_sessions + UPSERT fighter_stats directly.
 * Offline path:  Enqueue to localStorage; returns { status: "saved_offline" }.
 *
 * The offline queue is flushed automatically by `useOfflineSync` hook
 * when network connectivity is restored.
 */
export async function persistWarriorTrainingSession(
  client: SupabaseClient,
  payload: WarriorTrainingSyncPayload,
): Promise<SyncResult> {
  const { fighterId, economics, advancement, monthlyXpAfter } = payload;
  const breakdown: SettlementBreakdown = economics.breakdown;

  // ── Build canonical session row ────────────────────────────────────────────
  const sessionBase = {
    fighter_id: fighterId,
    gross_amount: breakdown.gross,
    commission_pct: breakdown.commissionPct,
    commission: breakdown.commission,
    fee_amount: breakdown.commission,
    net_amount: breakdown.net,
    xp_awarded: economics.xpAward,
    level_before: advancement.levelBefore,
    level_after: advancement.levelAfter,
    total_xp_after: advancement.totalXpAfter,
    levels_gained: advancement.levelsJumped,
    monthly_xp_after: monthlyXpAfter ?? 0,
    currency: "RUB" as const,
  };

  // ── Check network ──────────────────────────────────────────────────────────
  const isOnline =
    typeof navigator === "undefined" ? true : navigator.onLine;

  if (!isOnline) {
    const pendingCount = enqueueOfflineSession(sessionBase);
    console.info(
      `[Warrior Point] offline — session queued (${pendingCount} pending)`,
    );
    return { status: "saved_offline", pendingCount };
  }

  // ── Online: persist immediately ────────────────────────────────────────────

  // 1. Upsert fighter stats
  const statsRow: Record<string, unknown> = {
    fighter_id: fighterId,
    total_xp: advancement.totalXpAfter,
    current_level: advancement.levelAfter,
    updated_at: new Date().toISOString(),
  };
  if (monthlyXpAfter !== undefined) {
    statsRow.monthly_xp = monthlyXpAfter;
  }

  const { error: statsErr } = await upsertFighterStats(client, statsRow);
  if (statsErr) return { status: "error", error: statsErr };

  // 2. Insert session line
  const { error: sessErr } = await insertTrainingSession(client, {
    ...sessionBase,
    // Don't send monthly_xp_after to training_sessions — it's a stats-level field
    monthly_xp_after: undefined,
  });
  if (sessErr) return { status: "error", error: sessErr };

  return { status: "synced" };
}

// ── Convenience: validate offline commission math ─────────────────────────────

/**
 * Build a session row from raw gross amount using the canonical 19% split.
 * Useful for building offline queue entries outside the standard economy flow.
 */
export function buildSessionFromGross(
  fighterId: string,
  grossRub: number,
  xpAwarded: number,
  levelBefore: number,
  levelAfter: number,
  totalXpAfter: number,
  levelsGained: number,
  monthlyXpAfter: number,
): Omit<QueuedSession, "queueId" | "queuedAt" | "synced"> {
  const commission = Math.round(grossRub * (PLATFORM_COMMISSION_PCT / 100));
  const net = grossRub - commission;

  return {
    fighter_id: fighterId,
    gross_amount: grossRub,
    commission_pct: PLATFORM_COMMISSION_PCT,
    commission,
    fee_amount: commission,
    net_amount: net,
    xp_awarded: xpAwarded,
    level_before: levelBefore,
    level_after: levelAfter,
    total_xp_after: totalXpAfter,
    levels_gained: levelsGained,
    monthly_xp_after: monthlyXpAfter,
    currency: "RUB",
  };
}
