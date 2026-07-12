import { fighters, type Fighter } from "@/lib/fighters";
import { getCalibration } from "@/lib/calibration-store";
import { DEMO_FIGHTER_DB_ID } from "@/lib/warrior-constants";

/** Map XP total to a leaderboard-style score for overtakes. */
function xpToScore(xp: number): number {
  const calibration = getCalibration(DEMO_FIGHTER_DB_ID);
  const baseElo = calibration?.startingElo ?? 1642;
  return baseElo + Math.round(xp * 0.45);
}

/**
 * Fighters the viewer just passed on the leaderboard after earning XP.
 * Falls back to a deterministic count from xpGain when the pool is sparse.
 */
export function getOvertakenFighters(
  xpBefore: number,
  xpAfter: number,
): { count: number; fighters: Fighter[] } {
  const scoreBefore = xpToScore(xpBefore);
  const scoreAfter = xpToScore(xpAfter);

  const overtaken = fighters
    .filter((f) => f.elo > scoreBefore && f.elo <= scoreAfter)
    .sort((a, b) => b.elo - a.elo);

  if (overtaken.length > 0) {
    return { count: overtaken.length, fighters: overtaken.slice(0, 3) };
  }

  const xpGain = Math.max(0, xpAfter - xpBefore);
  const fallbackCount = Math.min(
    3,
    Math.max(1, Math.round(xpGain / 35)),
  );

  const pool = fighters
    .filter((f) => f.elo < scoreAfter)
    .sort((a, b) => b.elo - a.elo)
    .slice(0, fallbackCount);

  return { count: fallbackCount, fighters: pool };
}
