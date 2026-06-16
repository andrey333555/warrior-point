/**
 * Warrior Point — Organisations registry
 *
 * Master list of MMA / combat sports promotions.
 * Each entry drives:
 *   - Lotus-icon petals in OctagonWidget (fighter ↔ org data)
 *   - Organisations table in Supabase (migration 0007)
 *   - Leaderboard filtering and badge display
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContractStatus = "active" | "inactive" | "alumni";

/** A single petal field shown in the Lotus bloom. */
export type OrgPetalField = {
  label: string;       // e.g. "Рекорд в лиге"
  key: string;         // data key used when merging fighter-specific data
  defaultValue: string;
};

/** Static master entry for one organisation. */
export type OrgEntry = {
  id: string;
  name: string;
  shortName: string;
  /** Neon hex accent for marker / border. */
  accent: string;
  country: string;
  website?: string;
  /** Component key for the SVG logo (matches exports in org-logos.tsx). */
  logoKey: string;
  /** Lotus petal schema — values are overridden per-fighter. */
  petalSchema: OrgPetalField[];
};

/** Per-fighter record inside an organisation (stored in Supabase fighter_orgs). */
export type FighterOrgRecord = {
  orgId: string;
  fighterId: string;          // profiles.id
  contractStatus: ContractStatus;
  leagueWins: number;
  leagueLosses: number;
  leagueDraws: number;
  lastFightOpponent?: string;
  lastFightDate?: string;     // ISO date string
  lastFightResult?: "W" | "L" | "D";
  notes?: string;
};

// ── Organisations ─────────────────────────────────────────────────────────────

export const ORGANISATIONS: OrgEntry[] = [
  {
    id: "aca",
    name: "Absolute Championship Akhmat",
    shortName: "ACA",
    accent: "#facc15",
    country: "RU",
    website: "https://acafights.com",
    logoKey: "AcaLogo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Промоутер",          key: "promoter",            defaultValue: "Мовлади Алибеков" },
    ],
  },
  {
    id: "rcc",
    name: "Russian Cagefighting Championship",
    shortName: "RCC",
    accent: "#f87171",
    country: "RU",
    website: "https://rcc.ru",
    logoKey: "RccLogo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Дивизион",           key: "division",            defaultValue: "Featherweight" },
    ],
  },
  {
    id: "m1",
    name: "M-1 Global",
    shortName: "M-1",
    accent: "#22d3ee",
    country: "RU",
    website: "https://m-1.tv",
    logoKey: "M1Logo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Выступлений",        key: "appearances",         defaultValue: "—" },
    ],
  },
  {
    id: "amc",
    name: "AMC Fight Nights",
    shortName: "AMC",
    accent: "#34d399",
    country: "RU",
    website: "https://fight-nights.com",
    logoKey: "AmcLogo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Чемпионства",        key: "titles",              defaultValue: "—" },
    ],
  },
  {
    id: "hardcore",
    name: "Hardcore MMA",
    shortName: "HC",
    accent: "#e879f9",
    country: "RU",
    website: "https://hardcore.mma",
    logoKey: "HardcoreLogo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
    ],
  },
  {
    id: "topdog",
    name: "Top Dog",
    shortName: "TD",
    accent: "#fb7185",
    country: "RU",
    website: "https://topdog.ru",
    logoKey: "TopDogLogo",
    petalSchema: [
      { label: "Рекорд в серии",     key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус",             key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
    ],
  },
  {
    id: "marathon360",
    name: "Marathon 360",
    shortName: "M360",
    accent: "#a78bfa",
    country: "RU",
    logoKey: "Marathon360Logo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
    ],
  },
  {
    id: "nashedelo",
    name: "Наше Дело",
    shortName: "НД",
    accent: "#4ade80",
    country: "RU",
    logoKey: "NasheDeloLogo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Формат",             key: "format",              defaultValue: "Народный ММА" },
    ],
  },
  // ── Fight Nights Global ──────────────────────────────────────────────────
  {
    id: "fng",
    name: "Fight Nights Global",
    shortName: "FNG",
    accent: "#34d399",
    country: "RU",
    website: "https://fnmma.ru",
    logoKey: "FngLogo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Серия",              key: "division",            defaultValue: "Fight Nights" },
    ],
  },
  // ── Open FC ──────────────────────────────────────────────────────────────
  {
    id: "openfc",
    name: "Open FC",
    shortName: "OFC",
    accent: "#fb923c",
    country: "RU",
    website: "https://openfc.ru",
    logoKey: "OpenFcLogo",
    petalSchema: [
      { label: "Рекорд в лиге",      key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Формат",             key: "format",              defaultValue: "Open Format" },
    ],
  },
  // ── UFC ───────────────────────────────────────────────────────────────────
  {
    id: "ufc",
    name: "Ultimate Fighting Championship",
    shortName: "UFC",
    accent: "#ef4444",
    country: "US",
    website: "https://ufc.com",
    logoKey: "UfcLogo",
    petalSchema: [
      { label: "Рекорд в UFC",       key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Рейтинг",            key: "notes",               defaultValue: "—" },
    ],
  },
  // ── ONE Championship ─────────────────────────────────────────────────────
  {
    id: "one",
    name: "ONE Championship",
    shortName: "ONE",
    accent: "#dc2626",
    country: "SG",
    website: "https://onefc.com",
    logoKey: "OneFcLogo",
    petalSchema: [
      { label: "Рекорд в ONE",       key: "leagueRecord",        defaultValue: "—" },
      { label: "Статус контракта",   key: "contractStatus",      defaultValue: "—" },
      { label: "Последний бой",      key: "lastFight",           defaultValue: "—" },
      { label: "Дивизион",           key: "division",            defaultValue: "—" },
    ],
  },
];

// ── Demo fighter org records ─────────────────────────────────────────────────
// Seed data — mirrored in Supabase migration 0007

export const DEMO_FIGHTER_ORG_RECORDS: FighterOrgRecord[] = [
  {
    orgId: "aca",
    fighterId: "WP-INTL-X9-441K",
    contractStatus: "active",
    leagueWins: 5,
    leagueLosses: 2,
    leagueDraws: 0,
    lastFightOpponent: "Нэйт Лэндвер",
    lastFightDate: "2024-03-15",
    lastFightResult: "W",
    notes: "Действующий контракт",
  },
  {
    orgId: "rcc",
    fighterId: "WP-INTL-X9-441K",
    contractStatus: "alumni",
    leagueWins: 4,
    leagueLosses: 1,
    leagueDraws: 1,
    lastFightOpponent: "Расул Мирзаев",
    lastFightDate: "2022-11-05",
    lastFightResult: "L",
  },
  {
    orgId: "m1",
    fighterId: "WP-INTL-X9-441K",
    contractStatus: "alumni",
    leagueWins: 12,
    leagueLosses: 1,
    leagueDraws: 0,
    lastFightOpponent: "Ёсики Накахара",
    lastFightDate: "2021-09-18",
    lastFightResult: "W",
    notes: "12 выступлений",
  },
  {
    orgId: "marathon360",
    fighterId: "WP-INTL-X9-441K",
    contractStatus: "alumni",
    leagueWins: 5,
    leagueLosses: 0,
    leagueDraws: 0,
    lastFightOpponent: "Кэйсукэ Сасу",
    lastFightDate: "2020-06-27",
    lastFightResult: "W",
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Find an org entry by id. */
export function findOrg(id: string): OrgEntry | undefined {
  return ORGANISATIONS.find((o) => o.id === id);
}

/** @deprecated Use DEMO_FIGHTER_ORG_RECORDS */
export const VIKTOR_ORG_RECORDS = DEMO_FIGHTER_ORG_RECORDS;

/** Get the demo fighter's record for a given org. */
export function getDemoFighterOrgRecord(orgId: string): FighterOrgRecord | undefined {
  return DEMO_FIGHTER_ORG_RECORDS.find((r) => r.orgId === orgId);
}

/** @deprecated Use getDemoFighterOrgRecord */
export function getViktorOrgRecord(orgId: string): FighterOrgRecord | undefined {
  return getDemoFighterOrgRecord(orgId);
}

/** Format a fighter-org record into lotus petals. */
export function buildOrgPetals(
  org: OrgEntry,
  record?: FighterOrgRecord,
): { label: string; value: string }[] {
  if (!record) {
    return org.petalSchema.map((f) => ({ label: f.label, value: f.defaultValue }));
  }

  const leagueRecord =
    `${record.leagueWins}-${record.leagueLosses}` +
    (record.leagueDraws > 0 ? `-${record.leagueDraws}` : "");

  const contractLabel: Record<ContractStatus, string> = {
    active:   "Действующий",
    inactive: "Неактивен",
    alumni:   "Ветеран",
  };

  const lastFight = record.lastFightOpponent
    ? `${record.lastFightResult ?? "—"} · ${record.lastFightOpponent}`
    : "—";

  const valMap: Record<string, string> = {
    leagueRecord:   leagueRecord,
    contractStatus: contractLabel[record.contractStatus],
    lastFight:      lastFight,
    appearances:    String(record.leagueWins + record.leagueLosses + record.leagueDraws),
    notes:          record.notes ?? "—",
  };

  return org.petalSchema.map((f) => ({
    label: f.label,
    value: valMap[f.key] ?? f.defaultValue,
  }));
}
