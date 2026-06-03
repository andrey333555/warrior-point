-- Warrior Point · Day-1 migration
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent (safe to run many times — all ADD COLUMN use IF NOT EXISTS).
-- -----------------------------------------------------------------------

-- ── 1. training_sessions ─────────────────────────────────────────────────
-- Fixes: "Could not find the 'commission_pct' column" orange error.
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS commission_pct  NUMERIC  NOT NULL DEFAULT 19;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS commission      BIGINT   NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS net_amount      BIGINT   NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS xp_awarded      INTEGER  NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS level_before    SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS level_after     SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS total_xp_after  INTEGER  NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS levels_gained   SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS currency        TEXT     NOT NULL DEFAULT 'RUB';

-- ── 2. fighter_stats ─────────────────────────────────────────────────────
ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS monthly_xp          INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS current_status      TEXT;
ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS is_winner           BOOLEAN   NOT NULL DEFAULT FALSE;
ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS monthly_winner_at   TIMESTAMPTZ;

-- ── 3. profiles table (Roles: admin · coach · fighter) ───────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            TEXT PRIMARY KEY,
  display_name  TEXT,
  role          TEXT NOT NULL DEFAULT 'fighter'
                  CHECK (role IN ('admin', 'coach', 'fighter')),
  coach_id      TEXT REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'fighter';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_id TEXT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'coach', 'fighter'));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_profiles_write" ON public.profiles;
CREATE POLICY "warrior_anon_profiles_write"
  ON public.profiles FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── 4. Seed personas ──────────────────────────────────────────────────────
-- WP-INTL-X9-441K is the fighter_id used in the app (DEMO_FIGHTER_DB_ID).
INSERT INTO public.profiles (id, display_name, role, coach_id)
VALUES
  ('WP-ADMIN-001',    'Warrior Point Admin',  'admin',   NULL),
  ('WP-COACH-001',    'Сергей Романов',       'coach',   NULL),
  ('WP-INTL-X9-441K', 'Виктор Колесник',     'fighter', 'WP-COACH-001')
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      role         = EXCLUDED.role,
      coach_id     = EXCLUDED.coach_id,
      updated_at   = NOW();

-- ── 5. Reload PostgREST schema cache (removes the orange error immediately)
NOTIFY pgrst, 'reload schema';
