/**
 * League-scoped fight cards for the Lotus / FightsList expansion.
 * Simulates Sherdog / promotion API payloads until live feeds are wired.
 */

export type LeagueFight = Readonly<{
  id: string;
  date: string;
  opponent: string;
  outcome: "WIN" | "LOSS" | "DRAW";
  method: "KO" | "TKO" | "SUB" | "DEC" | "NC";
  orgId: string;
}>;

export const LEAGUE_FIGHTS: Record<string, readonly LeagueFight[]> = {
  aca: [
    {
      id: "aca-1",
      date: "2024-03-15",
      opponent: "Nate Landwehr",
      outcome: "WIN",
      method: "KO",
      orgId: "aca",
    },
    {
      id: "aca-2",
      date: "2023-09-22",
      opponent: "Aslan Dalgiev",
      outcome: "WIN",
      method: "DEC",
      orgId: "aca",
    },
    {
      id: "aca-3",
      date: "2022-11-18",
      opponent: "Magomedrasul Khasbulaev",
      outcome: "LOSS",
      method: "DEC",
      orgId: "aca",
    },
  ],
  rcc: [
    {
      id: "rcc-1",
      date: "2022-11-05",
      opponent: "Rasul Mirzaev",
      outcome: "LOSS",
      method: "SUB",
      orgId: "rcc",
    },
    {
      id: "rcc-2",
      date: "2021-06-12",
      opponent: "Ivan Buchatsky",
      outcome: "WIN",
      method: "TKO",
      orgId: "rcc",
    },
  ],
  fng: [
    {
      id: "fng-1",
      date: "2020-12-05",
      opponent: "Artur Sargsyan",
      outcome: "WIN",
      method: "KO",
      orgId: "fng",
    },
    {
      id: "fng-2",
      date: "2019-08-17",
      opponent: "Sergey Kharitonov",
      outcome: "WIN",
      method: "DEC",
      orgId: "fng",
    },
  ],
  ufc: [
    {
      id: "ufc-1",
      date: "2026-05-15",
      opponent: "Damir Ozaru",
      outcome: "WIN",
      method: "TKO",
      orgId: "ufc",
    },
    {
      id: "ufc-2",
      date: "2026-04-18",
      opponent: "Aslan Berdimuhammedov",
      outcome: "LOSS",
      method: "SUB",
      orgId: "ufc",
    },
  ],
  one: [
    {
      id: "one-1",
      date: "2025-01-10",
      opponent: "TBD Challenger",
      outcome: "WIN",
      method: "KO",
      orgId: "one",
    },
  ],
};

export function fightsForLeague(orgId: string): readonly LeagueFight[] {
  return LEAGUE_FIGHTS[orgId] ?? [];
}

export function getLatestFight(): LeagueFight | null {
  const all = Object.values(LEAGUE_FIGHTS).flat();
  if (all.length === 0) return null;
  return [...all].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}
