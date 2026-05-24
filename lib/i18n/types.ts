/** Strongly typed dictionary shape — extend here when new strings land. */

export type WarriorDictionary = Readonly<{
  meta: Readonly<{
    appName: string;
    passportTitle: string;
    leaderboardTitle: string;
    tagline: string;
  }>;
  nav: Readonly<{
    passport: string;
    leaderboard: string;
  }>;
  passport: Readonly<{
    header: Readonly<{
      eyebrow: string;
      subtitle: string;
    }>;
    identity: Readonly<{
      combatantId: string;
      tierRank: string;
      levelPrefix: string;
      levelSeparator: string;
    }>;
    xp: Readonly<{
      arcLabel: string;
      toNextGate: (xp: number) => string;
      grandmasterOrbit: string;
      globalEcho: string;
      grandmasterFrontier: string;
    }>;
    elo: Readonly<{
      title: string;
      deltaSuffix: string;
      worldwideStanding: string;
      topPercentile: (pct: number) => string;
      percentileNote: string;
      lifetimeSessions: string;
    }>;
    payouts: Readonly<{
      title: string;
      gross: string;
      fee: (pct: number) => string;
      net: string;
      note: string;
    }>;
    biometrics: Readonly<{
      title: string;
      readyBadge: string;
      intro: string;
      hrv: string;
      recovery: string;
      loadIndex: string;
      syncStandby: string;
    }>;
    actions: Readonly<{
      ledgerSyncTitle: string;
      ledgerSyncIntro: (pct: number) => string;
      billPerSession: string;
      recordSession: string;
      syncing: string;
      dataSynced: string;
      envMissing: string;
    }>;
    rehydrating: string;
    profileDetails: Readonly<{
      title: string;
      liveLedger: (count: number) => string;
      totalSessions: Readonly<{
        label: string;
        hint: string;
        note: string;
      }>;
      careerEarnings: Readonly<{
        label: string;
        hint: string;
        note: string;
      }>;
      coachRevenue: Readonly<{
        label: string;
        hint: (pct: number) => string;
        note: (pct: number) => string;
      }>;
    }>;
    lastSession: Readonly<{
      title: string;
      gross: string;
      feeLabel: (pct: number) => string;
      net: string;
      xpRouted: string;
    }>;
    levelUp: Readonly<{
      brand: string;
      levelWord: string;
      upWord: string;
      rankPrefix: string;
      surge: (jumps: number) => string;
      ladderUpdated: string;
    }>;
    footer: string;
  }>;
  leaderboard: Readonly<{
    eyebrow: string;
    title: string;
    intro: string;
    columns: Readonly<{
      rank: string;
      name: string;
      xp: string;
      workouts: string;
    }>;
    emptyKeys: string;
    emptyData: string;
    envMissingWarning: string;
  }>;
  language: Readonly<{
    switchLabel: string;
    currentLabel: string;
  }>;
}>;
