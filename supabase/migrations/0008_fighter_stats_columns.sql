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
