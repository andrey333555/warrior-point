/**
 * Warrior Point · Split-session (Battle BlaBlaCar) type definitions.
 *
 * A "split" is a group training session created by a coach.
 * Fighters book seats; the session activates once ≥ MIN_SEATS are filled.
 */

export const SPLIT_STATUSES = [
  "waiting",
  "active",
  "done",
  "cancelled",
] as const;

export type SplitStatus = (typeof SPLIT_STATUSES)[number];

/** Minimum bookings required to flip status from waiting → active. */
export const MIN_SPLIT_SEATS = 4;
/** Maximum allowed seats per split. */
export const MAX_SPLIT_SEATS = 6;

export type TrainingSplit = {
  id: string;
  coachId: string;
  topic: string;
  pricePerSeat: number;
  maxSeats: number;
  minSeats: number;
  status: SplitStatus;
  createdAt: string;
  startsAt: string | null;
  /** Number of confirmed bookings (enriched client-side). */
  bookedCount: number;
  /** Whether the current user has already booked this split. */
  isBookedByMe: boolean;
};

export const SPLIT_STATUS_LABELS: Record<SplitStatus, string> = {
  waiting: "Ожидание",
  active: "Активно",
  done: "Выполнено",
  cancelled: "Отменено",
};

export const SPLIT_STATUS_STYLE: Record<
  SplitStatus,
  { border: string; bg: string; text: string; dot: string }
> = {
  waiting: {
    border: "border-amber-400/45",
    bg: "bg-amber-500/[0.07]",
    text: "text-amber-200",
    dot: "bg-amber-400",
  },
  active: {
    border: "border-emerald-400/45",
    bg: "bg-emerald-500/[0.07]",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
  },
  done: {
    border: "border-zinc-500/35",
    bg: "bg-zinc-500/[0.05]",
    text: "text-zinc-400",
    dot: "bg-zinc-500",
  },
  cancelled: {
    border: "border-rose-500/35",
    bg: "bg-rose-500/[0.06]",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
};

export function isSplitStatus(v: unknown): v is SplitStatus {
  return typeof v === "string" && (SPLIT_STATUSES as readonly string[]).includes(v);
}
