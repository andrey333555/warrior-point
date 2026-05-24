import type { WarriorDictionary } from "@/lib/i18n/types";

export const en: WarriorDictionary = {
  meta: {
    appName: "Warrior Point",
    passportTitle: "Warrior Passport · Global registry",
    leaderboardTitle: "Leaderboard · Warrior Point",
    tagline: "Sovereign combat ledger · worldwide",
  },
  nav: {
    passport: "Passport",
    leaderboard: "Leaderboard",
  },
  passport: {
    header: {
      eyebrow: "Warrior Passport",
      subtitle: "Global combat registry · cross-border credential",
    },
    identity: {
      combatantId: "Combatant ID",
      tierRank: "Tier rank",
      levelPrefix: "Level",
      levelSeparator: "/",
    },
    xp: {
      arcLabel: "XP arc",
      toNextGate: (xp) => `${xp} XP to next gate`,
      grandmasterOrbit: "Grandmaster orbit",
      globalEcho: "Global progression echo",
      grandmasterFrontier: "Grandmaster frontier",
    },
    elo: {
      title: "Global ELO",
      deltaSuffix: "last 30 days",
      worldwideStanding: "Worldwide standing",
      topPercentile: (pct) => `Top ${pct}%`,
      percentileNote: "percentile · live leaderboard pool",
      lifetimeSessions: "Audited sessions · lifetime",
    },
    payouts: {
      title: "Sovereign payouts · RUB",
      gross: "Gross settlements",
      fee: (pct) => `Platform fee (${pct}%)`,
      net: "Net to combatant",
      note: "Figures mirror Warrior Point withholdings · every sanctioned training line subject to nineteen-percent protocol levy.",
    },
    biometrics: {
      title: "Biometrics",
      readyBadge: "Ready for Apple Health",
      intro: "Encrypted physiological reserve for cross-border sanction reviews.",
      hrv: "HRV",
      recovery: "Recovery",
      loadIndex: "Load index",
      syncStandby: "sync standby",
    },
    actions: {
      ledgerSyncTitle: "Training ledger sync",
      ledgerSyncIntro: (pct) =>
        `Ingest sanctioned session economics: platform fee enforced at ${pct}% · XP aligns with payout after withholdings.`,
      billPerSession: "Bill per session · demo",
      recordSession: "RECORD SESSION",
      syncing: "SYNC…",
      dataSynced: "Data synced with Supabase!",
      envMissing:
        "Supabase env vars missing · add NEXT_PUBLIC_* keys to `.env.local`",
    },
    rehydrating: "Rehydrating sovereign ledger…",
    profileDetails: {
      title: "Fighter profile details",
      liveLedger: (count) => `Live ledger · ${count} sessions`,
      totalSessions: {
        label: "Total Sessions",
        hint: "Audited training count",
        note: "Each RECORD SESSION click = row in `training_sessions` (₽1,000 gross)",
      },
      careerEarnings: {
        label: "Career Earnings",
        hint: "Gross before 19% levy",
        note: "Sum of `gross_amount` across all sanctioned sessions",
      },
      coachRevenue: {
        label: "Coach Revenue",
        hint: (pct) => `${pct}% protocol levy`,
        note: (pct) => `${pct}% platform withhold · coach / Warrior Point cash`,
      },
    },
    lastSession: {
      title: "Latest sanction",
      gross: "Gross",
      feeLabel: (pct) => `Fee ${pct}%`,
      net: "Net",
      xpRouted: "XP routed",
    },
    levelUp: {
      brand: "Warrior Point",
      levelWord: "LEVEL",
      upWord: "UP",
      rankPrefix: "Rank",
      surge: (jumps) => `+${jumps} tier jumps · surge certified`,
      ladderUpdated: "Global ladder updated",
    },
    footer: "Warrior Point · Sovereign ledger · worldwide",
  },
  leaderboard: {
    eyebrow: "Global ladder",
    title: "Leaderboard · Top 10",
    intro: "Sovereign XP registry · audited training volume",
    columns: {
      rank: "Rank",
      name: "Name",
      xp: "XP",
      workouts: "Sessions",
    },
    emptyKeys: "No config · feeds empty",
    emptyData: "No fighter_stats rows yet · record a session",
    envMissingWarning:
      "Supabase keys missing · set NEXT_PUBLIC_* in `.env.local`",
  },
  language: {
    switchLabel: "Language",
    currentLabel: "Current language",
  },
};
