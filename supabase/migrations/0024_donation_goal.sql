-- Warrior Point · Migration 0024 — Public donation campaign title
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS donation_goal TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_donation_goal_len;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_donation_goal_len
  CHECK (donation_goal IS NULL OR char_length(btrim(donation_goal)) BETWEEN 1 AND 120);

-- Public card /fighter/romanov
UPDATE public.profiles
SET
  donation_goal = 'Сборы в Краснодар',
  updated_at    = NOW()
WHERE slug = 'romanov';

NOTIFY pgrst, 'reload schema';
