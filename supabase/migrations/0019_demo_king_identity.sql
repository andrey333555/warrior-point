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
