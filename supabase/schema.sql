-- Warrior Point — run once in Supabase SQL Editor (Dashboard → SQL → New query).
-- Exposes permissive anon policies for the demo MVP; tighten for production auth.

CREATE TABLE IF NOT EXISTS public.fighter_stats (
  fighter_id TEXT PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  monthly_xp INTEGER NOT NULL DEFAULT 0,
  current_level SMALLINT NOT NULL DEFAULT 1,
  current_status TEXT,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  monthly_winner_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent additions for existing installs (run safely many times):
ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS monthly_xp INTEGER NOT NULL DEFAULT 0;
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
  commission_pct NUMERIC NOT NULL DEFAULT 19,
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

-- Idempotent additions for existing installs (covers the `commission_pct`
-- / `commission` schema-cache errors on older tables):
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC NOT NULL DEFAULT 19;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS commission BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS net_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS level_before SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS level_after SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS total_xp_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS levels_gained SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'RUB';
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

-- ───────────────────────── Roles (Admin · Coach · Fighter) ─────────────────────────
-- One profile row per actor. `id` aligns with `fighter_stats.fighter_id` (and a future
-- auth.uid()). `role` is constrained to the three Warrior Point personas; `coach_id`
-- links a fighter to the coach who manages them.
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'fighter'
    CHECK (role IN ('admin', 'coach', 'fighter')),
  coach_id TEXT REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent additions for existing installs:
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'fighter';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coach_id TEXT;

-- Enforce the role whitelist (drop+recreate so re-runs stay clean):
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'coach', 'fighter'));

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_coach_idx ON public.profiles (coach_id);

ALTER TABLE public.fighter_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fighter_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "warrior_anon_profiles_write" ON public.profiles;
CREATE POLICY "warrior_anon_profiles_write"
  ON public.profiles
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ───────────────────────── Seed demo personas ─────────────────────────
-- Admin (you), one coach, and the demo fighter Виктор Колесник linked to that coach.
INSERT INTO public.profiles (id, display_name, role, coach_id)
VALUES
  ('WP-ADMIN-001', 'Warrior Point Admin', 'admin', NULL),
  ('WP-COACH-001', 'Head Coach', 'coach', NULL),
  ('WP-INTL-X9-441K', 'Виктор Колесник', 'fighter', 'WP-COACH-001')
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      coach_id = EXCLUDED.coach_id,
      updated_at = NOW();

-- Refresh PostgREST schema cache so new columns resolve immediately
-- (clears the orange schema-cache error at the bottom of the app).
NOTIFY pgrst, 'reload schema';
