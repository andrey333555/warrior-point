/** Mock card of Victor Kolesnik's three most recent sanctioned bouts. */

export type FightResult = "W" | "L" | "D";

export type WarriorFightRecord = Readonly<{
  id: string;
  opponent: string;
  flag: string;
  date: string;
  result: FightResult;
  method: string;
  xpAwarded: number;
  eloDelta: number;
}>;

export const RECENT_FIGHTS_MOCK: ReadonlyArray<WarriorFightRecord> = [
  {
    id: "wp-fight-2026-05-15",
    opponent: "Damir Ozaru",
    flag: "TR",
    date: "2026-05-15",
    result: "W",
    method: "TKO · R2 · 3:18",
    xpAwarded: 220,
    eloDelta: 18,
  },
  {
    id: "wp-fight-2026-05-02",
    opponent: "Igor Karchenko",
    flag: "UA",
    date: "2026-05-02",
    result: "W",
    method: "Decision · Unanimous",
    xpAwarded: 165,
    eloDelta: 11,
  },
  {
    id: "wp-fight-2026-04-18",
    opponent: "Aslan Berdimuhammedov",
    flag: "TM",
    date: "2026-04-18",
    result: "L",
    method: "Submission · RNC · R3",
    xpAwarded: 95,
    eloDelta: -22,
  },
];

/** Aggregated W/L from the mock — used as a baseline before live ledger merges in. */
export function mockRecordSummary(): { wins: number; losses: number; draws: number } {
  const wins = RECENT_FIGHTS_MOCK.filter((f) => f.result === "W").length;
  const losses = RECENT_FIGHTS_MOCK.filter((f) => f.result === "L").length;
  const draws = RECENT_FIGHTS_MOCK.filter((f) => f.result === "D").length;

  return { wins, losses, draws };
}
