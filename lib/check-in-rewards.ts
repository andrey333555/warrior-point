"use client";

/**
 * Local booking + XP rewards after a **system-verified** fixation sync.
 * Do not call directly from check-in UI — use fixation-sync instead.
 */

import { addBooking, completeBooking } from "@/lib/bookings";
import { awardTrainingXp, getXp } from "@/lib/xp";
import type {
  CheckInVerifiedResult,
  TrainerCheckInSite,
  VerifyResult,
} from "@/lib/verify";

export function applyCheckInRewards(
  site: TrainerCheckInSite,
  distanceM: number,
  verify: Pick<VerifyResult, "method" | "confidence" | "details">,
): CheckInVerifiedResult {
  const xpBefore = getXp().total;

  const booking = addBooking({
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

  completeBooking(booking.id);

  const xpState = awardTrainingXp(
    `Check-in · ${site.trainerName} · ${verify.method}`,
  );

  return {
    trainerId: site.trainerIdNum,
    trainerName: site.trainerName,
    gymId: site.gymId,
    gymName: site.gymName,
    distanceM,
    verifiedAt: new Date().toISOString(),
    bookingId: booking.id,
    xpAwarded: xpState.total - xpBefore,
    streakDays: xpState.streakDays,
    totalXp: xpState.total,
    method: verify.method,
    confidence: verify.confidence,
    details: verify.details,
  };
}
