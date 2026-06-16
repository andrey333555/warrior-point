import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MIN_SPLIT_SEATS,
  isSplitStatus,
  type SplitStatus,
  type TrainingSplit,
} from "@/lib/splits";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetch all open splits (waiting + active) and enrich each with booking count
 * and whether `currentFighterId` has already booked.
 */
export async function fetchSplits(
  client: SupabaseClient,
  opts: {
    statuses?: SplitStatus[];
    currentFighterId?: string;
  } = {},
): Promise<TrainingSplit[]> {
  const { statuses = ["waiting", "active"], currentFighterId } = opts;

  // 1. Fetch splits
  let q = client
    .from("training_splits")
    .select("*")
    .order("created_at", { ascending: false });

  if (statuses.length) {
    q = q.in("status", statuses);
  }

  const { data: splits, error: splitsErr } = await q;

  if (splitsErr || !splits?.length) return [];

  const ids = splits.map((r) => r.id as string);

  // 2. Fetch all booking rows for those splits
  const { data: bookings } = await client
    .from("split_bookings")
    .select("split_id, fighter_id")
    .in("split_id", ids);

  const countMap = new Map<string, number>();
  const mySet = new Set<string>();

  for (const b of bookings ?? []) {
    const sid = b.split_id as string;
    countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    if (currentFighterId && b.fighter_id === currentFighterId) {
      mySet.add(sid);
    }
  }

  return splits.map((r) => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    topic: r.topic as string,
    pricePerSeat: num(r.price_per_seat),
    maxSeats: num(r.max_seats),
    minSeats: num(r.min_seats ?? MIN_SPLIT_SEATS),
    status: isSplitStatus(r.status) ? r.status : "waiting",
    createdAt: r.created_at as string,
    startsAt: typeof r.starts_at === "string" ? r.starts_at : null,
    bookedCount: countMap.get(r.id as string) ?? 0,
    isBookedByMe: mySet.has(r.id as string),
  }));
}

/** Create a new split session (coach / admin only). */
export async function createSplit(
  client: SupabaseClient,
  payload: {
    coachId: string;
    topic: string;
    pricePerSeat: number;
    maxSeats: number;
  },
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await client
    .from("training_splits")
    .insert({
      coach_id: payload.coachId,
      topic: payload.topic.trim(),
      price_per_seat: Math.max(0, Math.round(payload.pricePerSeat)),
      max_seats: Math.min(Math.max(payload.maxSeats, 4), 6),
      min_seats: MIN_SPLIT_SEATS,
      status: "waiting",
    })
    .select("id")
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: { id: data.id as string }, error: null };
}

/**
 * Book one seat in a split.
 *
 * Returns `{ bookedCount, activated }`:
 *   - `bookedCount` — total confirmed bookings after this op.
 *   - `activated`   — true if the booking pushed status to 'active'.
 */
export async function bookSplitSeat(
  client: SupabaseClient,
  splitId: string,
  fighterId: string,
): Promise<{
  bookedCount: number;
  activated: boolean;
  error: Error | null;
}> {
  // 1. Insert booking row
  const { error: bookErr } = await client
    .from("split_bookings")
    .insert({ split_id: splitId, fighter_id: fighterId });

  if (bookErr) {
    if (bookErr.code === "23505") {
      return {
        bookedCount: 0,
        activated: false,
        error: new Error("Ты уже занял место в этом сплите"),
      };
    }
    return { bookedCount: 0, activated: false, error: new Error(bookErr.message) };
  }

  // 2. Count total bookings for this split
  const { count } = await client
    .from("split_bookings")
    .select("*", { count: "exact", head: true })
    .eq("split_id", splitId);

  const bookedCount = count ?? 0;

  // 3. Promote to 'active' when threshold reached
  let activated = false;
  if (bookedCount >= MIN_SPLIT_SEATS) {
    const { error: updateErr } = await client
      .from("training_splits")
      .update({ status: "active" })
      .eq("id", splitId)
      .eq("status", "waiting");

    if (!updateErr) activated = true;
  }

  return { bookedCount, activated, error: null };
}

/** Cancel a split (coach / admin only). */
export async function cancelSplit(
  client: SupabaseClient,
  splitId: string,
): Promise<{ error: Error | null }> {
  const { error } = await client
    .from("training_splits")
    .update({ status: "cancelled" })
    .eq("id", splitId);

  return { error: error ? new Error(error.message) : null };
}

// ── Gym-scoped splits (MAP · GymPopup) ──────────────────────────────────────

export type GymSplit = TrainingSplit & {
  coachName: string;
  endsAt: string | null;
  /** Pre-formatted slot label, e.g. "19:00 — 20:30" */
  timeLabel: string;
};

function formatSplitTime(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return "19:00 — 20:30";
  const start = new Date(startsAt);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (endsAt) {
    const end = new Date(endsAt);
    return `${fmt(start)} — ${fmt(end)}`;
  }
  const end = new Date(start.getTime() + 90 * 60_000);
  return `${fmt(start)} — ${fmt(end)}`;
}

/**
 * Open splits for a gym marker — matches `gym_id` first, falls back to `coach_id`.
 * Hydrates coach display names from `profiles`.
 */
export async function fetchGymSplits(
  client: SupabaseClient,
  opts: {
    gymId: string;
    coachId?: string;
    currentFighterId?: string;
  },
): Promise<GymSplit[]> {
  const { gymId, coachId, currentFighterId } = opts;

  let q = client
    .from("training_splits")
    .select("*")
    .in("status", ["waiting", "active"])
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(6);

  const { data: byGym, error: gymErr } = await q.eq("gym_id", gymId);

  let rows = byGym ?? [];

  if (gymErr?.message.match(/Could not find the 'gym_id' column/) && coachId) {
    const { data: byCoach } = await client
      .from("training_splits")
      .select("*")
      .eq("coach_id", coachId)
      .in("status", ["waiting", "active"])
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(6);
    rows = byCoach ?? [];
  } else if (!rows.length && coachId) {
    const { data: byCoach } = await client
      .from("training_splits")
      .select("*")
      .eq("coach_id", coachId)
      .in("status", ["waiting", "active"])
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(6);
    rows = byCoach ?? [];
  }

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id as string);
  const coachIds = [...new Set(rows.map((r) => r.coach_id as string).filter(Boolean))];

  const { data: bookings } = await client
    .from("split_bookings")
    .select("split_id, fighter_id")
    .in("split_id", ids);

  const countMap = new Map<string, number>();
  const mySet = new Set<string>();
  for (const b of bookings ?? []) {
    const sid = b.split_id as string;
    countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    if (currentFighterId && b.fighter_id === currentFighterId) mySet.add(sid);
  }

  const nameByCoach = new Map<string, string>();
  if (coachIds.length) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, display_name")
      .in("id", coachIds);
    for (const p of profiles ?? []) {
      const dn = (p as { display_name?: unknown }).display_name;
      if (typeof dn === "string" && dn.trim()) nameByCoach.set(p.id as string, dn);
    }
  }

  return rows.map((r) => {
    const startsAt = typeof r.starts_at === "string" ? r.starts_at : null;
    const endsAt = typeof r.ends_at === "string" ? r.ends_at : null;
    const cid = r.coach_id as string;

    return {
      id: r.id as string,
      coachId: cid,
      coachName: nameByCoach.get(cid) ?? "Тренер",
      topic: r.topic as string,
      pricePerSeat: num(r.price_per_seat) || 2000,
      maxSeats: num(r.max_seats) || 6,
      minSeats: num(r.min_seats ?? MIN_SPLIT_SEATS),
      status: isSplitStatus(r.status) ? r.status : "waiting",
      createdAt: r.created_at as string,
      startsAt,
      endsAt,
      timeLabel: formatSplitTime(startsAt, endsAt),
      bookedCount: countMap.get(r.id as string) ?? 0,
      isBookedByMe: mySet.has(r.id as string),
    };
  });
}
