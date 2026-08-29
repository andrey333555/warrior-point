-- Warrior Point · Migration 0025 — Public fighter nickname
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_nickname_len;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_nickname_len
  CHECK (nickname IS NULL OR char_length(btrim(nickname)) BETWEEN 1 AND 48);

UPDATE public.profiles
SET
  nickname   = 'Уличный Боец',
  updated_at = NOW()
WHERE slug = 'romanov';

NOTIFY pgrst, 'reload schema';
