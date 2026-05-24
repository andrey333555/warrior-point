-- Warrior Point — run once in Supabase SQL Editor (Dashboard → SQL → New query).
-- Exposes permissive anon policies for the demo MVP; tighten for production auth.

CREATE TABLE IF NOT EXISTS public.fighter_stats (
  fighter_id TEXT PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level SMALLINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

ALTER TABLE public.fighter_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

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
