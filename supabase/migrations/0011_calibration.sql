-- Warrior Point · Migration 0011 — стартовая калибровка
-- skill_tier · elo_rating · is_verified

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS elo_rating INTEGER,
  ADD COLUMN IF NOT EXISTS skill_tier TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
