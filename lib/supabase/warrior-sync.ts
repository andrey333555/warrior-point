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

// ── Server session API ─────────────────────────────────────────────────────────

/**
 * Persist one session through the server route (`/api/session/complete`).
 * XP and settlement are recomputed server-side (service role), so the anon
 * key never writes `training_sessions` / `fighter_stats` directly.
 */
async function postSessionToServer(opts: {
  fighterId: string;
  grossRub: number;
  sessionType?: string;
  createdAt?: string;
}): Promise<{ error: Error | null }> {
  try {
    const res = await fetch("/api/session/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });

    if (res.ok) return { error: null };

    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return {
      error: new Error(data?.message ?? `Session sync failed (${res.status})`),
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err : new Error("Session sync network error"),
    };
  }
}

// ── Offline queue flush ────────────────────────────────────────────────────────

export type FlushResult = {
  flushed: number;
  failed: number;
  remaining: number;
  errors: Error[];
};

/**
 * Flush all pending offline sessions through the server session route.
 *
 * Strategy:
 *   1. Load queue from localStorage.
 *   2. POST each entry to /api/session/complete (server recomputes XP).
 *   3. Track successes; remove them from the queue.
 *   4. Leave failed entries in the queue for the next flush attempt.
 */
export async function flushOfflineQueue(_client?: SupabaseClient | null): Promise<FlushResult> {
  const queue = loadQueue();
  if (!queue.length) return { flushed: 0, failed: 0, remaining: 0, errors: [] };

  const synced = new Set<string>();
  const errors: Error[] = [];

  for (const entry of queue) {
    const { error } = await postSessionToServer({
      fighterId: entry.fighter_id,
      grossRub: entry.gross_amount,
      sessionType: "offline_sync",
      // Preserve the original queue timestamp as created_at so ordering is correct
      createdAt: entry.queuedAt,
    });

    if (error) {
      errors.push(new Error(`[${entry.queueId}] session sync: ${error.message}`));
      continue;
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
 * Online path:   POST /api/session/complete — server recomputes XP/settlement
 *                and writes with the service-role client.
 * Offline path:  Enqueue to localStorage; returns { status: "saved_offline" }.
 *
 * The offline queue is flushed automatically by `useOfflineSync` hook
 * when network connectivity is restored.
 */
export async function persistWarriorTrainingSession(
  _client: SupabaseClient | null,
  payload: WarriorTrainingSyncPayload,
): Promise<SyncResult> {
  const { fighterId, economics, advancement, monthlyXpAfter } = payload;
  const breakdown: SettlementBreakdown = economics.breakdown;

  // ── Build canonical session row (offline queue format) ─────────────────────
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

  // ── Online: persist through the server route ────────────────────────────────
  const { error } = await postSessionToServer({
    fighterId,
    grossRub: breakdown.gross,
    sessionType: "training",
  });

  if (error) {
    // Network hiccup mid-request — keep the session in the offline queue.
    const pendingCount = enqueueOfflineSession(sessionBase);
    console.warn(
      `[Warrior Point] session sync failed (${error.message}) — queued (${pendingCount} pending)`,
    );
    return { status: "saved_offline", pendingCount };
  }

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
