-- Warrior Point — run once in Supabase SQL Editor (Dashboard → SQL → New query).
-- Exposes permissive anon policies for the demo MVP; tighten for production auth.

CREATE TABLE IF NOT EXISTS public.fighter_stats (
  fighter_id TEXT PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level SMALLINT NOT NULL DEFAULT 1,
  current_status TEXT,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  monthly_winner_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent additions for existing installs (run safely many times):
ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS current_status TEXT;
ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS is_winner BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS monthly_winner_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  fighter_id TEXT NOT NULL,
  gross_amount BIGINT NOT NULL,
  commission_pct SMALLINT NOT NULL DEFAULT 19,
  commission BIGINT NOT NULL,
  net_amount BIGINT NOT NULL,
  xp_awarded INTEGER NOT NULL,
  level_before SMALLINT NOT NULL,
  level_after SMALLINT NOT NULL,
  total_xp_after INTEGER NOT NULL,
  levels_gained SMALLINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RUB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS training_sessions_fighter_created_idx
  ON public.training_sessions (fighter_id, created_at DESC);

-- Immutable audit trail of awards (Winner of the Month, future perks…)
CREATE TABLE IF NOT EXISTS public.fighter_awards (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  fighter_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  period TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fighter_awards_fighter_idx
  ON public.fighter_awards (fighter_id, granted_at DESC);

ALTER TABLE public.fighter_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fighter_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_fighter_stats_write" ON public.fighter_stats;
CREATE POLICY "warrior_anon_fighter_stats_write"
  ON public.fighter_stats
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "warrior_anon_training_sessions_insert" ON public.training_sessions;
CREATE POLICY "warrior_anon_training_sessions_insert"
  ON public.training_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "warrior_anon_training_sessions_select" ON public.training_sessions;
CREATE POLICY "warrior_anon_training_sessions_select"
  ON public.training_sessions
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "warrior_anon_fighter_awards_write" ON public.fighter_awards;
CREATE POLICY "warrior_anon_fighter_awards_write"
  ON public.fighter_awards
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
