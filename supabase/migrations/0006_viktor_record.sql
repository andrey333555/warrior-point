-- Warrior Point · Migration 0006 — Viktor Kolesnik official fight record
-- Source: Tapology / official БК «Кузня» profile
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

-- ── Step 4: Update Viktor's fight record ─────────────────────────────────────
-- Official record: 26 wins · 4 losses · 1 draw
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
