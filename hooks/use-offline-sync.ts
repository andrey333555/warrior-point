"use client";

/**
 * useOfflineSync — background sync hook for Warrior Point offline queue.
 *
 * Responsibilities:
 *   1. Expose the current count of pending (unsynced) offline sessions.
 *   2. Listen for `window.online` events and auto-flush the queue.
 *   3. Allow manual flush via the returned `flush()` function.
 *   4. Attempt an initial flush on mount (catches sessions queued in a
 *      previous browser session that never got a chance to sync).
 *
 * Usage:
 *   const { pendingCount, isSyncing, lastSyncAt, flush } = useOfflineSync(client);
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  flushOfflineQueue,
  offlinePendingCount,
  type FlushResult,
} from "@/lib/supabase/warrior-sync";
import {
  syncConfirmedFixations,
  fixationAwaitingCount,
} from "@/lib/fixation-sync";

// Re-export for consumers who only import from the hook
export type { FlushResult };

export type OfflineSyncState = {
  /** Number of sessions waiting to be synced. */
  pendingCount: number;
  /** True while a flush operation is in progress. */
  isSyncing: boolean;
  /** ISO string of the last successful flush, or null. */
  lastSyncAt: string | null;
  /** Result of the last flush attempt (null before first flush). */
  lastResult: FlushResult | null;
  /** Manually trigger a flush. No-op if already syncing or no client. */
  flush: () => void;
};

export function useOfflineSync(
  client: SupabaseClient | null,
  fighterId?: string,
): OfflineSyncState {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FlushResult | null>(null);

  // Prevent concurrent flushes
  const syncingRef = useRef(false);

  // ── Core flush function ──────────────────────────────────────────────────

  const flush = useCallback(async () => {
    if (!client || syncingRef.current) return;

    // Double-check we're actually online
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const pending = offlinePendingCount();
    const fixationPending = fighterId ? fixationAwaitingCount(fighterId) : 0;
    if (pending === 0 && fixationPending === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await flushOfflineQueue(client);

      if (fighterId) {
        const fixationResult = await syncConfirmedFixations(client, fighterId);
        if (fixationResult.synced > 0) {
          console.info(
            `[Warrior Point] fixation sync: ${fixationResult.synced} session(s)`,
          );
        }
        if (fixationResult.errors.length > 0) {
          console.warn("[Warrior Point] fixation sync errors:", fixationResult.errors);
        }
      }

      setLastResult(result);
      setPendingCount(result.remaining + (fighterId ? fixationAwaitingCount(fighterId) : 0));

      if (result.flushed > 0) {
        setLastSyncAt(new Date().toISOString());
        console.info(
          `[Warrior Point] offline sync: flushed ${result.flushed} session(s),` +
            ` ${result.remaining} remaining`,
        );
      }

      if (result.errors.length > 0) {
        console.warn(
          "[Warrior Point] offline sync errors:",
          result.errors.map((e) => e.message),
        );
      }
    } catch (err) {
      console.error("[Warrior Point] offline sync unexpected error:", err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [client, fighterId]);

  // Stable ref so event listeners always call the latest flush
  const flushRef = useRef(flush);
  useEffect(() => { flushRef.current = flush; }, [flush]);

  // ── Initialise pending count on mount ──────────────────────────────────────

  useEffect(() => {
    setPendingCount(
      offlinePendingCount() + (fighterId ? fixationAwaitingCount(fighterId) : 0),
    );
  }, [fighterId]);

  // ── Listen for online/offline events ──────────────────────────────────────

  useEffect(() => {
    if (!client) return;

    function onOnline() {
      window.setTimeout(() => {
        setPendingCount(
          offlinePendingCount() + (fighterId ? fixationAwaitingCount(fighterId) : 0),
        );
        void flushRef.current();
      }, 1200);
    }

    function onOffline() {
      setPendingCount(
        offlinePendingCount() + (fighterId ? fixationAwaitingCount(fighterId) : 0),
      );
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [client, fighterId]);

  // ── Attempt initial flush on mount (catch previous-session leftovers) ─────

  useEffect(() => {
    if (!client) return;
    if (typeof navigator !== "undefined" && navigator.onLine) {
      // Small delay to avoid blocking the initial page render
      const tid = window.setTimeout(() => void flushRef.current(), 2500);
      return () => window.clearTimeout(tid);
    }
  }, [client, fighterId]);

  return {
    pendingCount,
    isSyncing,
    lastSyncAt,
    lastResult,
    flush: useCallback(() => { void flush(); }, [flush]),
  };
}
