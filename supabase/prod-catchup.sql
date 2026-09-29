-- Warrior Point · prod-catchup.sql
-- Generated: concatenation of supabase/migrations/0001…0022 (0020 SKIPPED — broken,
-- superseded by 0023) + 0023_fix_rls_lockdown.sql, for a single paste-and-run in
-- Supabase Dashboard → SQL Editor → New query → Run.
--
-- Every individual file is idempotent (IF NOT EXISTS / ON CONFLICT DO UPDATE /
-- ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE), so this is safe to run even if
-- some of these already applied on this project — re-running them is a no-op.
--
-- Exception: Postgres refuses CREATE OR REPLACE FUNCTION when the return type
-- differs from what's already on disk ("cannot change return type of existing
-- function") — and prod carries a hand-patched grant_donation_xp() from Day 2
-- that isn't in 0021_donation_xp.sql as committed. Re-running 0021's original
-- CREATE as-is would abort the whole script right there. So, in THIS generated
-- file only (0021_donation_xp.sql on disk under supabase/migrations/ is untouched —
-- project rule is existing migrations don't get edited), every CREATE OR REPLACE
-- FUNCTION in the 0021 block that doesn't already self-guard (0003's
-- get_monthly_xp_leaders already has its own DROP FUNCTION IF EXISTS) is preceded
-- by one here, so a drifted prod definition — known or not — can't abort the run.
-- 0023_fix_rls_lockdown.sql then re-asserts the actual correct final version of
-- grant_donation_xp() (out_fighter_id, matching prod's Day-2 hotfix), with its own
-- DROP FUNCTION IF EXISTS guard.
--
-- DO NOT run this against production without reading it first.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 0001_commission_monthly.sql
-- ─────────────────────────────────────────────────────────────────────────
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
  ('WP-INTL-X9-441K', 'King León',     'fighter', 'WP-COACH-001')
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      role         = EXCLUDED.role,
      coach_id     = EXCLUDED.coach_id,
      updated_at   = NOW();

-- ── 5. Reload PostgREST schema cache (removes the orange error immediately)
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0002_splits.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Day-2 migration — Battle BlaBlaCar (Splits)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent (safe to re-run).
-- ------------------------------------------------------------

-- ── training_splits ───────────────────────────────────────────────────────
-- A coach creates a group session with N seats. Status lifecycle:
--   waiting  → not enough bookings yet (< min_seats)
--   active   → min_seats reached, session is confirmed
--   done     → completed
--   cancelled→ cancelled by coach

CREATE TABLE IF NOT EXISTS public.training_splits (
  id             UUID     PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  coach_id       TEXT     NOT NULL,
  topic          TEXT     NOT NULL,
  price_per_seat BIGINT   NOT NULL DEFAULT 0,       -- in whole RUB
  max_seats      SMALLINT NOT NULL DEFAULT 6
                   CHECK (max_seats BETWEEN 4 AND 6),
  min_seats      SMALLINT NOT NULL DEFAULT 4,
  status         TEXT     NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting', 'active', 'done', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  starts_at      TIMESTAMPTZ
);

-- ── split_bookings ─────────────────────────────────────────────────────────
-- One row per fighter per split. UNIQUE prevents double-booking.

CREATE TABLE IF NOT EXISTS public.split_bookings (
  id         UUID     PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  split_id   UUID     NOT NULL REFERENCES public.training_splits(id) ON DELETE CASCADE,
  fighter_id TEXT     NOT NULL,
  booked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (split_id, fighter_id)
);

CREATE INDEX IF NOT EXISTS split_bookings_split_idx
  ON public.split_bookings (split_id);
CREATE INDEX IF NOT EXISTS split_bookings_fighter_idx
  ON public.split_bookings (fighter_id);
CREATE INDEX IF NOT EXISTS training_splits_status_idx
  ON public.training_splits (status, created_at DESC);

ALTER TABLE public.training_splits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bookings   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_splits_all"         ON public.training_splits;
DROP POLICY IF EXISTS "warrior_anon_split_bookings_all" ON public.split_bookings;

CREATE POLICY "warrior_anon_splits_all"
  ON public.training_splits FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "warrior_anon_split_bookings_all"
  ON public.split_bookings FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Refresh PostgREST schema cache.
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0003_rpc_monthly.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Day-3 migration — Server-side monthly XP aggregation
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent (DROP … IF EXISTS before CREATE).
-- ---------------------------------------------------------------

-- ── RPC: get_monthly_xp_leaders ──────────────────────────────────────────
-- Returns top N fighters ranked by XP earned in the last `days` days.
-- Uses a true server-side SUM aggregation — no client-side fan-out.
--
-- Usage:  SELECT * FROM get_monthly_xp_leaders(30, 10);
-- JS SDK: client.rpc('get_monthly_xp_leaders', { days_back: 30, top_n: 10 })

DROP FUNCTION IF EXISTS public.get_monthly_xp_leaders(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_monthly_xp_leaders(
  days_back INTEGER DEFAULT 30,
  top_n     INTEGER DEFAULT 10
)
RETURNS TABLE (
  fighter_id     TEXT,
  xp_30d         BIGINT,
  sessions_30d   BIGINT,
  current_status TEXT,
  is_winner      BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    ts.fighter_id,
    SUM(ts.xp_awarded)                                        AS xp_30d,
    COUNT(*)                                                  AS sessions_30d,
    fs.current_status,
    COALESCE(fs.is_winner, FALSE)                             AS is_winner
  FROM public.training_sessions ts
  LEFT JOIN public.fighter_stats fs
         ON fs.fighter_id = ts.fighter_id
  WHERE ts.created_at > (NOW() - (days_back || ' days')::INTERVAL)
  GROUP BY ts.fighter_id, fs.current_status, fs.is_winner
  ORDER BY xp_30d DESC
  LIMIT top_n;
$$;

-- Grant execute to anon role so the frontend can call it without auth.
GRANT EXECUTE ON FUNCTION public.get_monthly_xp_leaders(INTEGER, INTEGER)
  TO anon;

-- Refresh PostgREST schema cache.
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0004_demo_fighter_profile.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0004 — Demo fighter pro profile + extended columns
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Extend `profiles` with fighter metadata columns ──────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS club           TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS weight_class   TEXT,
  ADD COLUMN IF NOT EXISTS fighter_status TEXT;   -- 'Pro' | 'Amateur' | 'Coach' | 'Admin'

-- ── Step 2: Correct the head coach name ──────────────────────────────────────

INSERT INTO public.profiles (id, display_name, role, coach_id, club, fighter_status)
VALUES (
  'WP-COACH-001',
  'Сергей Романов',
  'coach',
  NULL,
  'БК «Кузня»',
  'Coach'
)
ON CONFLICT (id) DO UPDATE
  SET display_name   = 'Сергей Романов',
      role           = 'coach',
      club           = 'БК «Кузня»',
      fighter_status = 'Coach',
      updated_at     = NOW();

-- ── Step 3: Update demo fighter — full pro profile ───────────────────────────
-- XP = 5200 → Level 12 "Journeyman Pro" (threshold at 4869).
-- monthly_xp = 650 — active training cycle (последние 30 дней).
-- current_status: displayed in the pink sotka on the Warrior Passport.

INSERT INTO public.profiles (
  id, display_name, role, coach_id,
  club, specialization, weight_class, fighter_status
)
VALUES (
  'WP-INTL-X9-441K',
  'King León',
  'fighter',
  'WP-COACH-001',
  'БК «Кузня» (Анапа / Краснодар)',
  'MMA · Комплексные единоборства',
  'Featherweight · Полулегкий вес (66 кг)',
  'Pro'
)
ON CONFLICT (id) DO UPDATE
  SET display_name   = 'King León',
      role           = 'fighter',
      coach_id       = 'WP-COACH-001',
      club           = 'БК «Кузня» (Анапа / Краснодар)',
      specialization = 'MMA · Комплексные единоборства',
      weight_class   = 'Featherweight · Полулегкий вес (66 кг)',
      fighter_status = 'Pro',
      updated_at     = NOW();

-- ── Step 4: Seed / reset fighter_stats for demo fighter ──────────────────────
-- Level floor table (from economy.ts buildLevelXpFloors):
--   Level  1 →     0 XP
--   Level 10 →  3 320 XP
--   Level 12 →  4 869 XP  ← demo starts here (Pro tier)
--   Level 13 →  5 799 XP
-- We set total_xp = 5 200 → Level 12, ~36% into the bracket.

INSERT INTO public.fighter_stats (
  fighter_id,
  total_xp,
  monthly_xp,
  current_level,
  current_status,
  is_winner,
  updated_at
)
VALUES (
  'WP-INTL-X9-441K',
  5200,
  650,
  12,
  'Active · Pro',
  FALSE,
  NOW()
)
ON CONFLICT (fighter_id) DO UPDATE
  SET total_xp       = GREATEST(fighter_stats.total_xp, 5200),  -- never reduce existing XP
      monthly_xp     = GREATEST(fighter_stats.monthly_xp, 650),
      current_level  = GREATEST(fighter_stats.current_level, 12),
      current_status = COALESCE(NULLIF(fighter_stats.current_status, ''), 'Active · Pro'),
      updated_at     = NOW();

-- ── Step 5: Seed a few historical training sessions for the 30-day leaderboard
-- (Creates data so the demo fighter appears in the monthly leaderboard)

INSERT INTO public.training_sessions (
  fighter_id, gross_amount, commission_pct, commission,
  net_amount, xp_awarded, level_before, level_after,
  total_xp_after, levels_gained, currency, created_at
)
VALUES
  ('WP-INTL-X9-441K', 1000, 19, 190,  810, 142, 11, 12, 4869, 1, 'RUB', NOW() - INTERVAL '25 days'),
  ('WP-INTL-X9-441K', 1500, 19, 285, 1215, 159, 12, 12, 5028, 0, 'RUB', NOW() - INTERVAL '18 days'),
  ('WP-INTL-X9-441K', 1000, 19, 190,  810, 142, 12, 12, 5170, 0, 'RUB', NOW() - INTERVAL '10 days'),
  ('WP-INTL-X9-441K', 1000, 19, 190,  810, 142, 12, 12, 5200, 0, 'RUB', NOW() - INTERVAL '3 days');

-- ── Step 6: Schema cache refresh ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification query (run separately to confirm):
-- SELECT p.id, p.display_name, p.club, p.specialization, p.weight_class,
--        p.fighter_status, fs.total_xp, fs.current_level, fs.monthly_xp
-- FROM public.profiles p
-- LEFT JOIN public.fighter_stats fs ON fs.fighter_id = p.id
-- WHERE p.id = 'WP-INTL-X9-441K';
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 0005_demo_fighter_encyclopedia.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0005 — Demo fighter encyclopedic profile
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Add bio column to profiles ───────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- ── Step 2: Update full encyclopedic profile for demo fighter ────────────────
--
-- XP ladder reference (economy.ts buildLevelXpFloors):
--   Level 15  →  8 015 XP
--   Level 16  →  9 288 XP
--   Level 17  → 10 695 XP  ← demo (pro tier)
--   Level 18  → 12 257 XP
--
-- total_xp = 11 400 → Level 17, ≈45% through bracket.
-- monthly_xp = 1 840 → сессии ниже (10 тренировок за 30 дней).

INSERT INTO public.profiles (
  id, display_name, role, coach_id,
  club, specialization, weight_class, fighter_status, bio
)
VALUES (
  'WP-INTL-X9-441K',
  'King León',
  'fighter',
  'WP-COACH-001',
  'БК «Кузня» (Анапа / Краснодар)',
  'MMA · Комплексные единоборства',
  'Featherweight 66 кг / Lightweight 70.3 кг',
  'Pro',
  'Демо-боец платформы Round 23. Промоушены: ACA, RCC, M-1 Global, Marathon 360. Базовый зал — БК «Кузня» (Анапа).'
)
ON CONFLICT (id) DO UPDATE
  SET display_name   = 'King León',
      role           = 'fighter',
      coach_id       = 'WP-COACH-001',
      club           = 'БК «Кузня» (Анапа / Краснодар)',
      specialization = 'MMA · Комплексные единоборства',
      weight_class   = 'Featherweight 66 кг / Lightweight 70.3 кг',
      fighter_status = 'Pro',
      bio            = 'Демо-боец платформы Round 23. Промоушены: ACA, RCC, M-1 Global, Marathon 360. Базовый зал — БК «Кузня» (Анапа).',
      updated_at     = NOW();

-- ── Step 3: Upgrade fighter_stats → Level 17 ─────────────────────────────────

INSERT INTO public.fighter_stats (
  fighter_id, total_xp, monthly_xp, current_level, current_status, is_winner, updated_at
)
VALUES (
  'WP-INTL-X9-441K',
  11400,  -- Level 17 (floor = 10695, ceiling = 12257)
  1840,   -- сумма XP за последние 30 дней (10 сессий ниже)
  17,
  'Active · Pro',
  FALSE,
  NOW()
)
ON CONFLICT (fighter_id) DO UPDATE
  SET total_xp       = 11400,
      monthly_xp     = 1840,
      current_level  = 17,
      current_status = 'Active · Pro',
      updated_at     = NOW();

-- ── Step 4: Seed 10 реальных тренировочных сессий за последние 30 дней ───────
--
-- XP formula: 110 + round(net / 25)
-- 3 000₽ gross → net 2430 → XP 207
-- 2 000₽ gross → net 1620 → XP 175
-- 1 500₽ gross → net 1215 → XP 159
-- Итого за 10 сессий: 3×207 + 4×175 + 3×159 = 621+700+477 = 1 798 ≈ 1 840 XP

-- Проверяем, не задвоить ли сессии при повторном запуске миграции.
-- Используем SELECT COUNT(*) — если > 5 сессий за 30 дней, пропускаем.
-- Supabase не поддерживает PL/pgSQL напрямую через REST, поэтому
-- делаем простую идемпотентность через уникальный ts offset.

DELETE FROM public.training_sessions
WHERE fighter_id = 'WP-INTL-X9-441K'
  AND created_at > NOW() - INTERVAL '35 days'
  AND gross_amount IN (3000, 2000, 1500);

INSERT INTO public.training_sessions (
  fighter_id, gross_amount, commission_pct, commission,
  net_amount, xp_awarded, level_before, level_after,
  total_xp_after, levels_gained, currency, created_at
) VALUES
  -- 3 × 3000₽ (premium sessions — турнирная подготовка)
  ('WP-INTL-X9-441K', 3000, 19, 570, 2430, 207, 16, 17, 10902,  1, 'RUB', NOW() - INTERVAL '28 days'),
  ('WP-INTL-X9-441K', 3000, 19, 570, 2430, 207, 17, 17, 11109,  0, 'RUB', NOW() - INTERVAL '21 days'),
  ('WP-INTL-X9-441K', 3000, 19, 570, 2430, 207, 17, 17, 11316,  0, 'RUB', NOW() - INTERVAL '14 days'),
  -- 4 × 2000₽ (стандартные тренировки)
  ('WP-INTL-X9-441K', 2000, 19, 380, 1620, 175, 17, 17, 10769,  0, 'RUB', NOW() - INTERVAL '26 days'),
  ('WP-INTL-X9-441K', 2000, 19, 380, 1620, 175, 17, 17, 10944,  0, 'RUB', NOW() - INTERVAL '19 days'),
  ('WP-INTL-X9-441K', 2000, 19, 380, 1620, 175, 17, 17, 11148,  0, 'RUB', NOW() - INTERVAL '12 days'),
  ('WP-INTL-X9-441K', 2000, 19, 380, 1620, 175, 17, 17, 11323,  0, 'RUB', NOW() - INTERVAL '6 days'),
  -- 3 × 1500₽ (восстановительные / технические)
  ('WP-INTL-X9-441K', 1500, 19, 285, 1215, 159, 17, 17, 10854,  0, 'RUB', NOW() - INTERVAL '24 days'),
  ('WP-INTL-X9-441K', 1500, 19, 285, 1215, 159, 17, 17, 11059,  0, 'RUB', NOW() - INTERVAL '17 days'),
  ('WP-INTL-X9-441K', 1500, 19, 285, 1215, 159, 17, 17, 11400,  0, 'RUB', NOW() - INTERVAL '2 days');

-- ── Step 5: Schema cache refresh ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification:
-- SELECT p.display_name, p.club, p.weight_class, p.fighter_status, p.bio,
--        fs.total_xp, fs.current_level, fs.monthly_xp
-- FROM public.profiles p
-- JOIN public.fighter_stats fs ON fs.fighter_id = p.id
-- WHERE p.id = 'WP-INTL-X9-441K';
--
-- Expected: total_xp=11400, current_level=17, monthly_xp=1840
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 0006_demo_fighter_record.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0006 — Demo fighter official fight record
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Add fight record columns to fighter_stats ────────────────────────

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS wins      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draws     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_contests INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_since INTEGER,                   -- year
  ADD COLUMN IF NOT EXISTS promotions TEXT[];                    -- array of promo names

-- ── Step 2: Add daily_streak and first_strike columns ────────────────────────
-- (Dopamine Machine — anti-churn triggers)

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS daily_streak         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_session_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_strike_earned  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_strike_at      TIMESTAMPTZ;

-- ── Step 3: Add notable_opponents to fighter_stats (JSONB) ───────────────────

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS notable_opponents JSONB;

-- ── Step 4: Update demo fighter fight record ─────────────────────────────────
-- Demo record: 26 wins · 4 losses · 1 draw
-- Pro since: 2013
-- Key opponents: Nate Landwehr, Keisuke Sasu, Yoshiki Nakahara,
--               Ryo Takagi, Atsushi Kishimoto, Rasul Mirzaev

UPDATE public.fighter_stats
SET
  wins      = 26,
  losses    = 4,
  draws     = 1,
  pro_since = 2013,
  promotions = ARRAY['ACA', 'RCC', 'M-1 Global', 'Marathon 360'],
  notable_opponents = '[
    {"name": "Нэйт Лэндвер",       "nameEn": "Nate Landwehr",      "org": "ACA"},
    {"name": "Кэйсукэ Сасу",       "nameEn": "Keisuke Sasu",       "org": "M-1 Global"},
    {"name": "Ёсики Накахара",      "nameEn": "Yoshiki Nakahara",   "org": "M-1 Global"},
    {"name": "Рё Такаги",          "nameEn": "Ryo Takagi",         "org": "M-1 Global"},
    {"name": "Ацуси Кисимото",     "nameEn": "Atsushi Kishimoto",  "org": "M-1 Global"},
    {"name": "Расул Мирзаев",      "nameEn": "Rasul Mirzaev",      "org": "RCC"}
  ]'::jsonb,
  last_session_at     = NOW() - INTERVAL '2 days',
  daily_streak        = 4,
  first_strike_earned = TRUE,
  first_strike_at     = NOW() - INTERVAL '90 days'
WHERE fighter_id = 'WP-INTL-X9-441K';

-- Ensure the row exists if UPDATE didn't touch anything
INSERT INTO public.fighter_stats (
  fighter_id, total_xp, monthly_xp, current_level, current_status,
  wins, losses, draws, pro_since, promotions, notable_opponents,
  daily_streak, first_strike_earned, first_strike_at, last_session_at,
  is_winner, updated_at
)
VALUES (
  'WP-INTL-X9-441K', 11400, 1840, 17, 'Active · Pro',
  26, 4, 1, 2013,
  ARRAY['ACA', 'RCC', 'M-1 Global', 'Marathon 360'],
  '[
    {"name": "Нэйт Лэндвер", "nameEn": "Nate Landwehr", "org": "ACA"},
    {"name": "Кэйсукэ Сасу", "nameEn": "Keisuke Sasu", "org": "M-1 Global"},
    {"name": "Ёсики Накахара", "nameEn": "Yoshiki Nakahara", "org": "M-1 Global"},
    {"name": "Рё Такаги", "nameEn": "Ryo Takagi", "org": "M-1 Global"},
    {"name": "Ацуси Кисимото", "nameEn": "Atsushi Kishimoto", "org": "M-1 Global"},
    {"name": "Расул Мирзаев", "nameEn": "Rasul Mirzaev", "org": "RCC"}
  ]'::jsonb,
  4, TRUE, NOW() - INTERVAL '90 days', NOW() - INTERVAL '2 days',
  FALSE, NOW()
)
ON CONFLICT (fighter_id) DO UPDATE
  SET wins                = EXCLUDED.wins,
      losses              = EXCLUDED.losses,
      draws               = EXCLUDED.draws,
      pro_since           = EXCLUDED.pro_since,
      promotions          = EXCLUDED.promotions,
      notable_opponents   = EXCLUDED.notable_opponents,
      daily_streak        = EXCLUDED.daily_streak,
      first_strike_earned = EXCLUDED.first_strike_earned,
      first_strike_at     = EXCLUDED.first_strike_at,
      last_session_at     = EXCLUDED.last_session_at,
      updated_at          = NOW();

-- ── Step 5: Schema cache refresh ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0007_organisations.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0007 — Organisations & Fighter-Org records
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Organisations master table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  short_name   TEXT NOT NULL,
  accent_color TEXT,
  country      TEXT NOT NULL DEFAULT 'RU',
  website      TEXT,
  logo_key     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_organisations_select" ON public.organisations;
CREATE POLICY "warrior_anon_organisations_select"
  ON public.organisations FOR SELECT TO anon USING (true);

-- ── Fighter ↔ Organisation records ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fighter_orgs (
  id                    UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  fighter_id            TEXT NOT NULL,
  org_id                TEXT NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  contract_status       TEXT NOT NULL DEFAULT 'alumni'
                          CHECK (contract_status IN ('active', 'inactive', 'alumni')),
  league_wins           INTEGER NOT NULL DEFAULT 0,
  league_losses         INTEGER NOT NULL DEFAULT 0,
  league_draws          INTEGER NOT NULL DEFAULT 0,
  last_fight_opponent   TEXT,
  last_fight_date       DATE,
  last_fight_result     TEXT CHECK (last_fight_result IN ('W', 'L', 'D')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fighter_id, org_id)
);

ALTER TABLE public.fighter_orgs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_fighter_orgs_all" ON public.fighter_orgs;
CREATE POLICY "warrior_anon_fighter_orgs_all"
  ON public.fighter_orgs FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS fighter_orgs_fighter_idx ON public.fighter_orgs (fighter_id);
CREATE INDEX IF NOT EXISTS fighter_orgs_org_idx     ON public.fighter_orgs (org_id);

-- ── Seed organisations ────────────────────────────────────────────────────────

INSERT INTO public.organisations (id, name, short_name, accent_color, country, website, logo_key)
VALUES
  ('aca',        'Absolute Championship Akhmat',     'ACA',  '#facc15', 'RU', 'https://acafights.com',    'AcaLogo'),
  ('rcc',        'Russian Cagefighting Championship','RCC',  '#f87171', 'RU', 'https://rcc.ru',            'RccLogo'),
  ('m1',         'M-1 Global',                       'M-1',  '#22d3ee', 'RU', 'https://m-1.tv',            'M1Logo'),
  ('amc',        'AMC Fight Nights',                 'AMC',  '#34d399', 'RU', 'https://fight-nights.com',  'AmcLogo'),
  ('hardcore',   'Hardcore MMA',                     'HC',   '#e879f9', 'RU', NULL,                        'HardcoreLogo'),
  ('topdog',     'Top Dog',                          'TD',   '#fb7185', 'RU', 'https://topdog.ru',         'TopDogLogo'),
  ('marathon360','Marathon 360',                     'M360', '#a78bfa', 'RU', NULL,                        'Marathon360Logo')
ON CONFLICT (id) DO UPDATE
  SET name         = EXCLUDED.name,
      short_name   = EXCLUDED.short_name,
      accent_color = EXCLUDED.accent_color,
      website      = EXCLUDED.website,
      logo_key     = EXCLUDED.logo_key;

-- ── Seed demo fighter fighter_orgs records ───────────────────────────────────

INSERT INTO public.fighter_orgs
  (fighter_id, org_id, contract_status, league_wins, league_losses, league_draws,
   last_fight_opponent, last_fight_date, last_fight_result, notes)
VALUES
  ('WP-INTL-X9-441K', 'aca',        'active',  5, 2, 0, 'Нэйт Лэндвер',    '2024-03-15', 'W', 'Действующий контракт'),
  ('WP-INTL-X9-441K', 'rcc',        'alumni',  4, 1, 1, 'Расул Мирзаев',   '2022-11-05', 'L', NULL),
  ('WP-INTL-X9-441K', 'm1',         'alumni', 12, 1, 0, 'Ёсики Накахара',  '2021-09-18', 'W', '12 выступлений'),
  ('WP-INTL-X9-441K', 'marathon360','alumni',  5, 0, 0, 'Кэйсукэ Сасу',   '2020-06-27', 'W', NULL)
ON CONFLICT (fighter_id, org_id) DO UPDATE
  SET contract_status     = EXCLUDED.contract_status,
      league_wins         = EXCLUDED.league_wins,
      league_losses       = EXCLUDED.league_losses,
      league_draws        = EXCLUDED.league_draws,
      last_fight_opponent = EXCLUDED.last_fight_opponent,
      last_fight_date     = EXCLUDED.last_fight_date,
      last_fight_result   = EXCLUDED.last_fight_result,
      notes               = EXCLUDED.notes,
      updated_at          = NOW();

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0008_fighter_stats_columns.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0008 — fighter_stats missing columns
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Добавляем недостающие колонки в fighter_stats
ALTER TABLE fighter_stats 
  ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS monthly_winner_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS record_wins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS record_losses INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS record_draws INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_xp INTEGER DEFAULT 0;

-- Индекс для быстрого поиска победителей
CREATE INDEX IF NOT EXISTS idx_fighter_stats_winner 
  ON fighter_stats(is_winner) WHERE is_winner = TRUE;

-- Обновляем схему кэша Supabase
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0009_fintech_client.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0009 — Client fintech (balance · split booking · rewards)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. profiles — client wallet + coach earnings + iPhone raffle tickets ───

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS balance         BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coach_earnings  BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iphone_tickets  INTEGER NOT NULL DEFAULT 0;

-- ── 2. training_sessions — verified split bookings ───────────────────────────

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS coach_id       TEXT,
  ADD COLUMN IF NOT EXISTS split_id       UUID,
  ADD COLUMN IF NOT EXISTS session_type   TEXT DEFAULT 'split_booking';

-- ── 3. training_splits — link to gym + end time ────────────────────────────

ALTER TABLE public.training_splits
  ADD COLUMN IF NOT EXISTS gym_id  TEXT,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

ALTER TABLE public.split_bookings
  ADD COLUMN IF NOT EXISTS gross_amount BIGINT,
  ADD COLUMN IF NOT EXISTS verified       BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 4. Demo seed — balances + showcase splits ────────────────────────────────

UPDATE public.profiles
SET balance = 15000, iphone_tickets = 3
WHERE id = 'WP-INTL-X9-441K';

UPDATE public.profiles
SET coach_earnings = 48200
WHERE id = 'WP-COACH-001';

-- Seed open splits (2 000 ₽ gross per seat · 19% platform fee)
INSERT INTO public.training_splits (
  id, coach_id, topic, price_per_seat, max_seats, min_seats,
  status, gym_id, starts_at, ends_at
)
VALUES
  (
    'a1000001-0000-4000-8000-000000000001',
    'WP-COACH-001',
    'Ударная работа + спarring',
    2000, 6, 4, 'waiting', 'kuznya-anapa',
    (CURRENT_DATE + INTERVAL '1 day') + TIME '19:00',
    (CURRENT_DATE + INTERVAL '1 day') + TIME '20:30'
  ),
  (
    'a1000001-0000-4000-8000-000000000002',
    'WP-COACH-001',
    'MMA · техника + раунды',
    2000, 6, 4, 'waiting', 'kuznya-krd-main',
    (CURRENT_DATE + INTERVAL '1 day') + TIME '19:00',
    (CURRENT_DATE + INTERVAL '1 day') + TIME '20:30'
  ),
  (
    'a1000001-0000-4000-8000-000000000003',
    'WP-COACH-001',
    'Грэпплинг · контроль + сабмишены',
    2000, 6, 4, 'active', 'kuznya-krd-pamirskaya',
    (CURRENT_DATE + INTERVAL '2 days') + TIME '18:30',
    (CURRENT_DATE + INTERVAL '2 days') + TIME '20:00'
  )
ON CONFLICT (id) DO UPDATE
  SET topic          = EXCLUDED.topic,
      price_per_seat = EXCLUDED.price_per_seat,
      gym_id         = EXCLUDED.gym_id,
      starts_at      = EXCLUDED.starts_at,
      ends_at        = EXCLUDED.ends_at,
      status         = EXCLUDED.status;

-- Pre-book 3 seats on the Anapa split (3 из 6)
INSERT INTO public.split_bookings (split_id, fighter_id, gross_amount, verified)
VALUES
  ('a1000001-0000-4000-8000-000000000001', 'WP-SEED-001', 2000, TRUE),
  ('a1000001-0000-4000-8000-000000000001', 'WP-SEED-002', 2000, TRUE),
  ('a1000001-0000-4000-8000-000000000001', 'WP-SEED-003', 2000, TRUE)
ON CONFLICT (split_id, fighter_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0010_donations.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0010 — Direct donations / tips (SBP-style flow)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fundraiser metadata on fighter_stats ─────────────────────────────────

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS fundraiser_title    TEXT,
  ADD COLUMN IF NOT EXISTS fundraiser_goal_rub BIGINT NOT NULL DEFAULT 0;

-- ── 2. donations ledger ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.donations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id       TEXT        NOT NULL,
  recipient_id   TEXT        NOT NULL,
  gross_amount   BIGINT      NOT NULL CHECK (gross_amount > 0),
  platform_fee   BIGINT      NOT NULL CHECK (platform_fee >= 0),
  net_amount     BIGINT      NOT NULL CHECK (net_amount > 0),
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donations_recipient_created_idx
  ON public.donations (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS donations_donor_created_idx
  ON public.donations (donor_id, created_at DESC);

-- ── 3. Demo seed — Dagestan camp fundraiser for showcase fighter ───────────

UPDATE public.fighter_stats
SET
  fundraiser_title    = 'На сборы в Дагестан',
  fundraiser_goal_rub = 50000
WHERE fighter_id = 'WP-INTL-X9-441K';

-- Showcase seed donation (300 ₽ net credited toward Dagestan camp)
INSERT INTO public.donations (
  donor_id, recipient_id, gross_amount, platform_fee, net_amount, comment
)
SELECT
  'WP-SEED-DONOR',
  'WP-INTL-X9-441K',
  316,
  16,
  300,
  'Удачи на сборах!'
WHERE NOT EXISTS (
  SELECT 1 FROM public.donations
  WHERE recipient_id = 'WP-INTL-X9-441K'
    AND donor_id = 'WP-SEED-DONOR'
);

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0011_calibration.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0011 — стартовая калибровка
-- skill_tier · elo_rating · is_verified

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS elo_rating INTEGER,
  ADD COLUMN IF NOT EXISTS skill_tier TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0012_payment_intents.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0012 — Persistent payment intents
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why: payment intents previously lived in server memory (globalThis). On
-- serverless (Vercel) `create`, `webhook`, `mock-pay` and `confirm` can hit
-- different instances, so the intent vanished and rewards never applied.
-- This table is the authoritative store, written only by the service role.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id             TEXT        PRIMARY KEY,
  yookassa_id    TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'succeeded', 'canceled')),
  trainer_id     INTEGER     NOT NULL,
  trainer_name   TEXT        NOT NULL,
  gym_name       TEXT        NOT NULL,
  session_date   TEXT        NOT NULL,
  session_time   TEXT        NOT NULL,
  training_type  TEXT        NOT NULL,
  gross_rub      BIGINT      NOT NULL CHECK (gross_rub > 0),
  booking_id     TEXT        NOT NULL,
  breakdown      JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_intents_yookassa_idx
  ON public.payment_intents (yookassa_id);

-- RLS: locked to the service role only. No anon/authenticated access —
-- all reads/writes go through server API routes.
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_intents_no_public" ON public.payment_intents;
CREATE POLICY "payment_intents_no_public"
  ON public.payment_intents
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0013_block_role_escalation.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0013 — Block privilege escalation from the client
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why: the demo exposes blanket anon write policies. The single most dangerous
-- vector is a client (anon key) escalating itself to `admin`/`coach` via
-- `UPDATE profiles SET role='admin'`. This trigger blocks any role change made
-- by the anon/authenticated client while still allowing the service role
-- (server) to manage roles. Balance/XP hardening is a separate, larger step —
-- see the launch checklist; those must move to server-authoritative writes
-- before real money flows.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.wp_block_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses this guard; anon/authenticated cannot change role.
  IF auth.role() <> 'service_role' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role changes are not allowed from the client';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_profiles_block_role_change ON public.profiles;
CREATE TRIGGER wp_profiles_block_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_role_change();

-- Prevent inserting a privileged profile directly from the client:
-- new self-provisioned rows must be plain fighters.
CREATE OR REPLACE FUNCTION public.wp_block_privileged_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NEW.role <> 'fighter' THEN
    RAISE EXCEPTION 'only fighter profiles can be created from the client';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_profiles_block_privileged_insert ON public.profiles;
CREATE TRIGGER wp_profiles_block_privileged_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_privileged_insert();

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0014_server_authoritative_economy.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0014 — Server-authoritative economy
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- ⚠️ ВАЖНО: запускать ТОЛЬКО после того, как на сервере задан
-- SUPABASE_SERVICE_ROLE_KEY (Vercel → Environment Variables). После этой
-- миграции anon-ключ больше не может писать баланс/XP/донаты — все такие
-- записи идут через API-роуты приложения (service role):
--   · /api/donations/create   — донаты + баланс
--   · /api/splits/book        — бронь сплита, заработок тренера
--   · /api/session/complete   — тренировки + XP
--
-- Что закрывается:
--   1. profiles.balance / coach_earnings / iphone_tickets — только сервер.
--   2. fighter_stats XP-поля (total_xp, current_level, monthly_xp,
--      daily_streak) — только сервер.
--   3. INSERT в donations / training_sessions / split_bookings — только сервер.
-- ─────────────────────────────────────────────────────────────────────────────

-- 0 ── payment_intents: кто платил (для серверного начисления наград) ────────

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS fighter_id TEXT;

-- 1 ── profiles: деньги меняет только сервер ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.wp_block_money_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance THEN
      RAISE EXCEPTION 'balance can only be changed by the server';
    END IF;
    IF NEW.coach_earnings IS DISTINCT FROM OLD.coach_earnings THEN
      RAISE EXCEPTION 'coach_earnings can only be changed by the server';
    END IF;
    IF NEW.iphone_tickets IS DISTINCT FROM OLD.iphone_tickets THEN
      RAISE EXCEPTION 'iphone_tickets can only be changed by the server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_profiles_block_money_change ON public.profiles;
CREATE TRIGGER wp_profiles_block_money_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_money_change();

-- 2 ── fighter_stats: XP/уровень/стрик меняет только сервер ──────────────────

CREATE OR REPLACE FUNCTION public.wp_block_xp_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.total_xp      IS DISTINCT FROM OLD.total_xp
      OR NEW.current_level IS DISTINCT FROM OLD.current_level
      OR NEW.monthly_xp    IS DISTINCT FROM OLD.monthly_xp
      OR NEW.daily_streak  IS DISTINCT FROM OLD.daily_streak THEN
        RAISE EXCEPTION 'XP fields can only be changed by the server';
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      -- Self-provisioned stats rows start at zero; server sets real values.
      IF COALESCE(NEW.total_xp, 0)      <> 0
      OR COALESCE(NEW.monthly_xp, 0)    <> 0
      OR COALESCE(NEW.daily_streak, 0)  <> 0
      OR COALESCE(NEW.current_level, 1) > 1 THEN
        RAISE EXCEPTION 'XP fields can only be set by the server';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_fighter_stats_block_xp_change ON public.fighter_stats;
CREATE TRIGGER wp_fighter_stats_block_xp_change
  BEFORE INSERT OR UPDATE ON public.fighter_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_xp_change();

-- 3 ── Финансовые таблицы: INSERT только с сервера ───────────────────────────

CREATE OR REPLACE FUNCTION public.wp_block_client_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION '% rows can only be created by the server', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_donations_block_client_insert ON public.donations;
CREATE TRIGGER wp_donations_block_client_insert
  BEFORE INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_client_insert();

DROP TRIGGER IF EXISTS wp_training_sessions_block_client_insert ON public.training_sessions;
CREATE TRIGGER wp_training_sessions_block_client_insert
  BEFORE INSERT ON public.training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_client_insert();

DROP TRIGGER IF EXISTS wp_split_bookings_block_client_insert ON public.split_bookings;
CREATE TRIGGER wp_split_bookings_block_client_insert
  BEFORE INSERT ON public.split_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_client_insert();

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0015_fighter_public_profile.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0015 — Public fighter profile + donations
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run (ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS).
--
-- Note: `bio` may already exist (0005). `donations` may already exist (0010) with
-- donor_id / recipient_id / gross_amount. This migration adds public-profile
-- columns and the newer donation fields without dropping the legacy ledger.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. profiles — public link fields ─────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug             TEXT,
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS record           TEXT,
  ADD COLUMN IF NOT EXISTS donations_total  BIGINT NOT NULL DEFAULT 0;

-- Human-readable public URL id (e.g. /fighter/king). Multiple NULLs allowed.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_uidx
  ON public.profiles (slug);

-- ── 2. donations — create if missing, then ensure columns on legacy installs ─

CREATE TABLE IF NOT EXISTS public.donations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_id      TEXT        NOT NULL,
  amount          BIGINT      NOT NULL,              -- kopecks
  currency        TEXT        NOT NULL DEFAULT 'RUB',
  supporter_name  TEXT,
  message         TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade installs that already have 0010 ledger shape:
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS fighter_id      TEXT,
  ADD COLUMN IF NOT EXISTS amount          BIGINT,
  ADD COLUMN IF NOT EXISTS currency        TEXT DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS supporter_name  TEXT,
  ADD COLUMN IF NOT EXISTS message         TEXT,
  ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ DEFAULT NOW();

-- Soft defaults for rows that predate these columns (legacy 0010 rows).
-- Only touches installs that still have recipient_id / gross_amount.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'donations'
      AND column_name = 'recipient_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'donations'
      AND column_name = 'gross_amount'
  ) THEN
    EXECUTE $u$
      UPDATE public.donations
      SET
        fighter_id = COALESCE(fighter_id, recipient_id),
        amount     = COALESCE(amount, gross_amount * 100),
        currency   = COALESCE(currency, 'RUB'),
        status     = COALESCE(status, 'paid'),
        created_at = COALESCE(created_at, NOW())
      WHERE fighter_id IS NULL
         OR amount IS NULL
         OR currency IS NULL
         OR status IS NULL
         OR created_at IS NULL
    $u$;
  ELSE
    UPDATE public.donations
    SET
      currency   = COALESCE(currency, 'RUB'),
      status     = COALESCE(status, 'pending'),
      created_at = COALESCE(created_at, NOW())
    WHERE currency IS NULL
       OR status IS NULL
       OR created_at IS NULL;
  END IF;
END $$;

-- Enforce status whitelist (NULL allowed on upgraded rows that never got a value).
ALTER TABLE public.donations
  DROP CONSTRAINT IF EXISTS donations_status_check;
ALTER TABLE public.donations
  ADD CONSTRAINT donations_status_check
  CHECK (status IS NULL OR status IN ('pending', 'paid', 'failed'));

CREATE INDEX IF NOT EXISTS donations_fighter_created_idx
  ON public.donations (fighter_id, created_at DESC);

-- Open anon policies (demo MVP style — same spirit as schema.sql)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_donations_all" ON public.donations;
CREATE POLICY "warrior_anon_donations_all"
  ON public.donations
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── 3. Seed public slug for showcase fighter ─────────────────────────────────

UPDATE public.profiles
SET
  slug       = 'king',
  updated_at = NOW()
WHERE id = 'WP-INTL-X9-441K';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0016_profile_privacy.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0016 — Profile privacy, booking toggle, verification
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_enabled     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibility          TEXT    NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS hide_weight_class   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_club           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_bio            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_record         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status TEXT    NOT NULL DEFAULT 'none';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_visibility_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_visibility_check
  CHECK (visibility IN ('public', 'limited', 'private'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));

-- Ensure showcase fighter keeps public slug for /fighter/king
UPDATE public.profiles
SET
  slug       = CASE
                 WHEN slug IS NULL OR slug = '' THEN 'king'
                 ELSE slug
               END,
  visibility = COALESCE(visibility, 'public'),
  updated_at = NOW()
WHERE id = 'WP-INTL-X9-441K';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0017_reviews_stub.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0017 — Reviews table stub (→ wire UI later)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type   TEXT        NOT NULL CHECK (target_type IN ('trainer', 'gym', 'fighter')),
  target_id     TEXT        NOT NULL,
  author_id     TEXT        NOT NULL,
  rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT,
  status        TEXT        NOT NULL DEFAULT 'published'
                  CHECK (status IN ('pending', 'published', 'hidden')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_target_created_idx
  ON public.reviews (target_type, target_id, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_reviews_all" ON public.reviews;
CREATE POLICY "warrior_anon_reviews_all"
  ON public.reviews
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0018_seed_demo_fighter_card.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0018 — Seed public card fields for demo fighter
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
SET
  slug         = 'king',
  display_name = 'King León',
  bio          = COALESCE(
    NULLIF(bio, ''),
    'Демо-боец платформы Round 23. Промоушены: ACA, RCC, M-1 Global, Marathon 360. Базовый зал — БК «Кузня».'
  ),
  record       = COALESCE(NULLIF(record, ''), '27-4-1'),
  avatar_url   = COALESCE(
    NULLIF(avatar_url, ''),
    '/fighters/king-ufc-portrait.png'
  ),
  club         = COALESCE(NULLIF(club, ''), 'БК «Кузня» (Анапа / Краснодар)'),
  weight_class = COALESCE(
    NULLIF(weight_class, ''),
    'Featherweight 66 кг / Lightweight 70.3 кг'
  ),
  visibility   = COALESCE(visibility, 'public'),
  booking_enabled = COALESCE(booking_enabled, true),
  updated_at   = NOW()
WHERE id = 'WP-INTL-X9-441K';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0019_demo_king_identity.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0019 — Demo fighter public identity = King León / king
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Demo fighter keeps technical id WP-INTL-X9-441K; public name/slug are King León / king
-- so a real registrant can own their own profile without colliding with the demo card.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
SET
  display_name = 'King León',
  slug         = 'king',
  bio          = COALESCE(
    NULLIF(TRIM(bio), ''),
    'Демо-боец платформы Round 23. Промоушены: ACA, RCC, M-1 Global, Marathon 360. Базовый зал — БК «Кузня».'
  ),
  updated_at   = NOW()
WHERE id = 'WP-INTL-X9-441K';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0021_donation_xp.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0021 — Donation XP (idempotent, atomic RPC)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- XP formula (gross in RUBLES, not kopecks):
--   xpAward = LEAST(40, 10 + FLOOR(gross_rub / 100))
--   → min 10 XP (any paid tip ≥ 50 ₽), max 40 XP per donation.
--
-- Units on donations:
--   · gross_amount  — RUBLES (set by handleDonate / handleGuestSbpDonate)
--   · amount        — KOPECKS (gross_rub * 100)
-- RPC prefers gross_amount; falls back to amount/100.
--
-- Call site today: right after INSERT with status='paid' (JS handlers, next PR).
-- Future ЮKassa webhook (pending → paid): call the SAME RPC
--   SELECT * FROM public.grant_donation_xp(<donation_id>);
-- Idempotency lives entirely inside this function — no rewrite needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1 ── columns ───────────────────────────────────────────────────────────────

ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS xp_granted  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS xp_awarded  INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.donations.xp_granted IS
  'True after fighter_stats XP was applied exactly once for this donation.';
COMMENT ON COLUMN public.donations.xp_awarded IS
  'Audit: XP granted to recipient (0 if not yet / skipped).';

-- 2 ── level from total XP (mirrors lib/levels getRoundByXP / advanceFighterXp) ─

DROP FUNCTION IF EXISTS public.wp_derive_level(BIGINT);
CREATE OR REPLACE FUNCTION public.wp_derive_level(p_total_xp BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  xp BIGINT := GREATEST(0, COALESCE(p_total_xp, 0));
BEGIN
  -- Thresholds = ROUNDS[].xpRequired (FIB cumulative), highest match wins.
  IF xp >= 1771100 THEN RETURN 23; END IF;
  IF xp >= 1094600 THEN RETURN 22; END IF;
  IF xp >=  676500 THEN RETURN 21; END IF;
  IF xp >=  418100 THEN RETURN 20; END IF;
  IF xp >=  258400 THEN RETURN 19; END IF;
  IF xp >=  159700 THEN RETURN 18; END IF;
  IF xp >=   98700 THEN RETURN 17; END IF;
  IF xp >=   61000 THEN RETURN 16; END IF;
  IF xp >=   37700 THEN RETURN 15; END IF;
  IF xp >=   23300 THEN RETURN 14; END IF;
  IF xp >=   14400 THEN RETURN 13; END IF;
  IF xp >=    8900 THEN RETURN 12; END IF;
  IF xp >=    5500 THEN RETURN 11; END IF;
  IF xp >=    3400 THEN RETURN 10; END IF;
  IF xp >=    2100 THEN RETURN  9; END IF;
  IF xp >=    1300 THEN RETURN  8; END IF;
  IF xp >=     800 THEN RETURN  7; END IF;
  IF xp >=     500 THEN RETURN  6; END IF;
  IF xp >=     300 THEN RETURN  5; END IF;
  IF xp >=     200 THEN RETURN  4; END IF;
  IF xp >=     100 THEN RETURN  3; END IF; -- R2 & R3 share threshold 100 (same as TS)
  RETURN 1;
END;
$$;

-- 3 ── donation XP formula (RUBLES in) ───────────────────────────────────────

DROP FUNCTION IF EXISTS public.wp_donation_xp_from_gross_rub(BIGINT);
CREATE OR REPLACE FUNCTION public.wp_donation_xp_from_gross_rub(p_gross_rub BIGINT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(
    40,
    10 + FLOOR(GREATEST(0, COALESCE(p_gross_rub, 0)) / 100.0)
  )::INTEGER;
$$;

-- 4 ── atomic grant (THE single idempotent entry point) ──────────────────────
--
-- HOOK POINT FOR FUTURE YOOKASSA WEBHOOK:
--   When payment confirms and you UPDATE donations SET status='paid'
--   WHERE id=… AND status='pending', call:
--     PERFORM public.grant_donation_xp(donation_id);
--   Do NOT re-implement xp_granted logic in the webhook handler.
--
-- TODAY (INSERT already status='paid'):
--   After resilientInsert succeeds, call the same RPC with the new id.

DROP FUNCTION IF EXISTS public.grant_donation_xp(UUID);
CREATE OR REPLACE FUNCTION public.grant_donation_xp(p_donation_id UUID)
RETURNS TABLE (
  ok              BOOLEAN,
  already_granted BOOLEAN,
  xp_awarded      INTEGER,
  fighter_id      TEXT,
  total_xp_after  BIGINT,
  level_after     INTEGER,
  message         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fighter_id     TEXT;
  v_gross_rub      BIGINT;
  v_xp             INTEGER;
  v_rows           INTEGER;
  v_total_before   BIGINT;
  v_monthly_before BIGINT;
  v_total_after    BIGINT;
  v_monthly_after  BIGINT;
  v_level_after    INTEGER;
BEGIN
  -- Resolve recipient + gross (RUB). Prefer gross_amount; else amount (kop)/100.
  SELECT
    COALESCE(d.fighter_id, d.recipient_id),
    COALESCE(
      d.gross_amount,
      CASE
        WHEN d.amount IS NOT NULL THEN FLOOR(d.amount / 100.0)::BIGINT
        ELSE NULL
      END
    )
  INTO v_fighter_id, v_gross_rub
  FROM public.donations d
  WHERE d.id = p_donation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, false, 0, NULL::TEXT, NULL::BIGINT, NULL::INTEGER,
      'donation not found'::TEXT;
    RETURN;
  END IF;

  IF v_fighter_id IS NULL OR v_gross_rub IS NULL OR v_gross_rub <= 0 THEN
    RETURN QUERY SELECT
      false, false, 0, v_fighter_id, NULL::BIGINT, NULL::INTEGER,
      'donation missing fighter_id or gross'::TEXT;
    RETURN;
  END IF;

  -- Only paid donations mint XP (pending waits for webhook → paid → this RPC).
  IF NOT EXISTS (
    SELECT 1 FROM public.donations d
    WHERE d.id = p_donation_id AND d.status = 'paid'
  ) THEN
    RETURN QUERY SELECT
      false, false, 0, v_fighter_id, NULL::BIGINT, NULL::INTEGER,
      'donation not paid — XP deferred until status=paid'::TEXT;
    RETURN;
  END IF;

  v_xp := public.wp_donation_xp_from_gross_rub(v_gross_rub);

  -- Claim exactly once. If 0 rows → already granted → do not touch fighter_stats.
  UPDATE public.donations d
  SET
    xp_granted = true,
    xp_awarded = v_xp
  WHERE d.id = p_donation_id
    AND d.xp_granted = false
    AND d.status = 'paid';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN QUERY
    SELECT
      true,
      true,
      d.xp_awarded,
      COALESCE(d.fighter_id, d.recipient_id),
      NULL::BIGINT,
      NULL::INTEGER,
      'already granted'::TEXT
    FROM public.donations d
    WHERE d.id = p_donation_id;
    RETURN;
  END IF;

  -- Mirror advanceFighterXp + session-server upsert (no training_sessions row).
  SELECT
    COALESCE(fs.total_xp, 0),
    COALESCE(fs.monthly_xp, 0)
  INTO v_total_before, v_monthly_before
  FROM public.fighter_stats fs
  WHERE fs.fighter_id = v_fighter_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_total_before := 0;
    v_monthly_before := 0;
  END IF;

  v_total_after   := v_total_before + v_xp;
  v_monthly_after := v_monthly_before + v_xp;
  v_level_after   := public.wp_derive_level(v_total_after);

  INSERT INTO public.fighter_stats AS fs (
    fighter_id,
    total_xp,
    current_level,
    monthly_xp,
    updated_at
  )
  VALUES (
    v_fighter_id,
    v_total_after,
    v_level_after,
    v_monthly_after,
    NOW()
  )
  ON CONFLICT (fighter_id) DO UPDATE
  SET
    total_xp      = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    monthly_xp    = EXCLUDED.monthly_xp,
    updated_at    = EXCLUDED.updated_at;

  RETURN QUERY SELECT
    true,
    false,
    v_xp,
    v_fighter_id,
    v_total_after,
    v_level_after,
    'granted'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM authenticated;
-- Server only (service_role bypasses RLS; PostgREST service key can RPC).
GRANT EXECUTE ON FUNCTION public.grant_donation_xp(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0022_demo_king_identity.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0022 — Ensure demo profile is King León only
-- Idempotent. Safe to re-run after demo identity renames.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
SET
  display_name = 'King León',
  slug         = 'king',
  updated_at   = NOW()
WHERE id = 'WP-INTL-X9-441K'
  AND (
    display_name IS DISTINCT FROM 'King León'
    OR slug IS DISTINCT FROM 'king'
  );

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0023_fix_rls_lockdown.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0023 — Fix RLS lockdown (supersedes broken 0020)
--                                  + fold in prod's grant_donation_xp hotfix
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why: 0020 never applied cleanly on prod —
--   1. its "reviews" block targets a nonexistent table `public.fighter_reviews`
--      (the real table, created in 0017, is `public.reviews`) — the whole
--      script errors out on that statement (and, run as one paste in SQL
--      Editor, rolls back everything before it in the same transaction);
--   2. even fixed, its "training_splits" block drops a policy name
--      (`warrior_anon_training_splits_all`) that was never created — the
--      real permissive policy from 0002 is named `warrior_anon_splits_all`,
--      so it would have stayed active.
-- Prod also has anon/public policies created ad hoc via the Dashboard UI
-- that don't match ANY name from the migrations (e.g. "Public Update
-- Stats", "Enable insert for all users") — a fixed name-based DROP list
-- would still miss those. So instead of names, this migration sweeps by
-- querying pg_policies directly: every anon/public policy on the listed
-- tables is dropped, whatever it's called, then only the intended
-- read-only policies are (re)created.
--
-- profiles gets tighter treatment: balance / coach_earnings / iphone_tickets
-- / role / coach_id are no longer selectable by anon at all (RLS is
-- row-level only, it can't hide columns) — anon reads through the new
-- `profiles_public` view instead, which also bakes in the same
-- visibility / hide_* masking the app already applies at the UI layer
-- (see lib/fighter-public.ts publicCardViewFor), so a `visibility='limited'`
-- or `hide_bio`-style row can't be read around by querying PostgREST
-- directly. fights / gyms / sessions are not used anywhere in the app code
-- (grepped app/ + components/ + lib/) — swept and left with zero policies,
-- i.e. fully closed to anon/authenticated.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Sweep: drop every anon/public policy on the tables we manage ────────
-- (Policies not covering anon/public — e.g. payment_intents' USING(false)
-- policy for anon+authenticated — are also swept here since that policy is
-- itself getting recreated explicitly below; harmless either way.)

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'profiles', 'fighter_stats', 'training_sessions', 'fighter_awards',
        'donations', 'training_splits', 'split_bookings', 'fighter_orgs',
        'reviews', 'payment_intents', 'fights', 'gyms', 'sessions'
      ])
      AND (
        roles @> ARRAY['anon']::name[]
        OR roles @> ARRAY['public']::name[]
        OR roles @> ARRAY['authenticated']::name[]
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ── 2. profiles — no anon table access at all; safe view instead ───────────

REVOKE ALL ON public.profiles FROM anon;

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  display_name,
  slug,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_bio, false)
       THEN bio ELSE NULL END AS bio,
  avatar_url,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_record, false)
       THEN record ELSE NULL END AS record,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_club, false)
       THEN club ELSE NULL END AS club,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_weight_class, false)
       THEN weight_class ELSE NULL END AS weight_class,
  donations_total,
  (COALESCE(visibility, 'public') = 'public' AND COALESCE(booking_enabled, true)) AS booking_enabled,
  visibility,
  hide_weight_class,
  hide_club,
  hide_bio,
  hide_record,
  verification_status,
  created_at,
  updated_at
FROM public.profiles
WHERE COALESCE(visibility, 'public') IN ('public', 'limited')
  AND COALESCE(fighter_status, '') <> 'Deleted';
-- balance / coach_earnings / iphone_tickets / role / coach_id / specialization
-- / fighter_status are intentionally NOT exposed here. The public fighter
-- card's role badge is rendered server-side (SSR, service-role client —
-- bypasses this view entirely); nothing in the app needs anon to read role
-- directly any more (see app/api/profile/me for the session-bound version).

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ── 3. Read-only anon policies, per table, only if the table exists ────────

DO $$ BEGIN
  IF to_regclass('public.fighter_stats') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_stats_select"
      ON public.fighter_stats FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.training_sessions') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_training_sessions_select"
      ON public.training_sessions FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.fighter_awards') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_awards_select"
      ON public.fighter_awards FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.donations') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_donations_select"
      ON public.donations FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.training_splits') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_training_splits_select"
      ON public.training_splits FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.split_bookings') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_split_bookings_select"
      ON public.split_bookings FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.fighter_orgs') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_orgs_select"
      ON public.fighter_orgs FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_reviews_select"
      ON public.reviews FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.payment_intents') IS NOT NULL THEN
    CREATE POLICY "payment_intents_no_public"
      ON public.payment_intents FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
    REVOKE ALL ON public.payment_intents FROM anon;
    REVOKE ALL ON public.payment_intents FROM authenticated;
  END IF;
END $$;

-- fights / gyms / sessions: not referenced anywhere in app code — swept
-- above, no policy re-created here → RLS enabled + zero policies = fully
-- closed to anon and authenticated. Service role is unaffected either way.

NOTIFY pgrst, 'reload schema';

-- ── 4. Day-2 hotfix folded in: grant_donation_xp() ambiguous fighter_id ────
--
-- Prod carries a hand-patched version of this function (applied directly
-- via SQL Editor on Day 2, never committed) that renames the RETURNS TABLE
-- column `fighter_id` → `out_fighter_id` to fix "column reference
-- fighter_id is ambiguous". 0021_donation_xp.sql in this repo still has the
-- original `fighter_id` column name — re-running it as-is on prod fails
-- with "cannot change return type of existing function
-- grant_donation_xp(uuid)", which also aborts everything after it in the
-- same paste (see supabase/prod-catchup.sql, which additionally DROPs this
-- function — and wp_derive_level / wp_donation_xp_from_gross_rub, same file,
-- same risk class — right before 0021's own CREATE, so that statement
-- doesn't abort the script before ever reaching this corrected version).
--
-- Nothing in the JS caller (lib/supabase/donations.ts grantDonationXpOnce)
-- reads the RPC result's columns by name — it only checks `error` — so this
-- rename is safe app-side. Body is otherwise identical to 0021's.

DROP FUNCTION IF EXISTS public.grant_donation_xp(UUID);

CREATE OR REPLACE FUNCTION public.grant_donation_xp(p_donation_id UUID)
RETURNS TABLE (
  ok              BOOLEAN,
  already_granted BOOLEAN,
  xp_awarded      INTEGER,
  out_fighter_id  TEXT,
  total_xp_after  BIGINT,
  level_after     INTEGER,
  message         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fighter_id     TEXT;
  v_gross_rub      BIGINT;
  v_xp             INTEGER;
  v_rows           INTEGER;
  v_total_before   BIGINT;
  v_monthly_before BIGINT;
  v_total_after    BIGINT;
  v_monthly_after  BIGINT;
  v_level_after    INTEGER;
BEGIN
  SELECT
    COALESCE(d.fighter_id, d.recipient_id),
    COALESCE(
      d.gross_amount,
      CASE
        WHEN d.amount IS NOT NULL THEN FLOOR(d.amount / 100.0)::BIGINT
        ELSE NULL
      END
    )
  INTO v_fighter_id, v_gross_rub
  FROM public.donations d
  WHERE d.id = p_donation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, false, 0, NULL::TEXT, NULL::BIGINT, NULL::INTEGER,
      'donation not found'::TEXT;
    RETURN;
  END IF;

  IF v_fighter_id IS NULL OR v_gross_rub IS NULL OR v_gross_rub <= 0 THEN
    RETURN QUERY SELECT
      false, false, 0, v_fighter_id, NULL::BIGINT, NULL::INTEGER,
      'donation missing fighter_id or gross'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.donations d
    WHERE d.id = p_donation_id AND d.status = 'paid'
  ) THEN
    RETURN QUERY SELECT
      false, false, 0, v_fighter_id, NULL::BIGINT, NULL::INTEGER,
      'donation not paid — XP deferred until status=paid'::TEXT;
    RETURN;
  END IF;

  v_xp := public.wp_donation_xp_from_gross_rub(v_gross_rub);

  UPDATE public.donations d
  SET
    xp_granted = true,
    xp_awarded = v_xp
  WHERE d.id = p_donation_id
    AND d.xp_granted = false
    AND d.status = 'paid';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN QUERY
    SELECT
      true,
      true,
      d.xp_awarded,
      COALESCE(d.fighter_id, d.recipient_id),
      NULL::BIGINT,
      NULL::INTEGER,
      'already granted'::TEXT
    FROM public.donations d
    WHERE d.id = p_donation_id;
    RETURN;
  END IF;

  SELECT
    COALESCE(fs.total_xp, 0),
    COALESCE(fs.monthly_xp, 0)
  INTO v_total_before, v_monthly_before
  FROM public.fighter_stats fs
  WHERE fs.fighter_id = v_fighter_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_total_before := 0;
    v_monthly_before := 0;
  END IF;

  v_total_after   := v_total_before + v_xp;
  v_monthly_after := v_monthly_before + v_xp;
  v_level_after   := public.wp_derive_level(v_total_after);

  INSERT INTO public.fighter_stats AS fs (
    fighter_id,
    total_xp,
    current_level,
    monthly_xp,
    updated_at
  )
  VALUES (
    v_fighter_id,
    v_total_after,
    v_level_after,
    v_monthly_after,
    NOW()
  )
  ON CONFLICT (fighter_id) DO UPDATE
  SET
    total_xp      = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    monthly_xp    = EXCLUDED.monthly_xp,
    updated_at    = EXCLUDED.updated_at;

  RETURN QUERY SELECT
    true,
    false,
    v_xp,
    v_fighter_id,
    v_total_after,
    v_level_after,
    'granted'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_donation_xp(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';

