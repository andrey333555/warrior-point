-- Warrior Point · Migration 0004 — Viktor Kolesnik pro profile + extended columns
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

-- ── Step 3: Update Viktor Kolesnik — full pro profile ────────────────────────
-- XP = 5200 → Level 12 "Journeyman Pro" (threshold at 4869).
-- monthly_xp = 650 — active training cycle (последние 30 дней).
-- current_status: displayed in the pink sotka on the Warrior Passport.

INSERT INTO public.profiles (
  id, display_name, role, coach_id,
  club, specialization, weight_class, fighter_status
)
VALUES (
  'WP-INTL-X9-441K',
  'Виктор Колесник',
  'fighter',
  'WP-COACH-001',
  'БК «Кузня» (Анапа / Краснодар)',
  'MMA · Комплексные единоборства',
  'Featherweight · Полулегкий вес (66 кг)',
  'Pro'
)
ON CONFLICT (id) DO UPDATE
  SET display_name   = 'Виктор Колесник',
      role           = 'fighter',
      coach_id       = 'WP-COACH-001',
      club           = 'БК «Кузня» (Анапа / Краснодар)',
      specialization = 'MMA · Комплексные единоборства',
      weight_class   = 'Featherweight · Полулегкий вес (66 кг)',
      fighter_status = 'Pro',
      updated_at     = NOW();

-- ── Step 4: Seed / reset fighter_stats for Viktor ────────────────────────────
-- Level floor table (from economy.ts buildLevelXpFloors):
--   Level  1 →     0 XP
--   Level 10 →  3 320 XP
--   Level 12 →  4 869 XP  ← Viktor starts here (Pro tier)
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
-- (Creates data so Viktor appears in the AgentsWindow monthly leaderboard)

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
