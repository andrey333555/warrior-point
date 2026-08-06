-- Warrior Point · Migration 0018 — Seed public card fields for Kolesnik
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
SET
  slug        = COALESCE(slug, 'kolesnik'),
  display_name = COALESCE(NULLIF(display_name, ''), 'Виктор Колесник'),
  bio         = COALESCE(
    NULLIF(bio, ''),
    'Профессиональный боец ММА. Промоушены: ACA, RCC, M-1 Global, Marathon 360. Базовый зал — БК «Кузня».'
  ),
  record      = COALESCE(NULLIF(record, ''), '27-4-1'),
  avatar_url  = COALESCE(
    NULLIF(avatar_url, ''),
    '/fighters/king-ufc-portrait.png'
  ),
  club        = COALESCE(NULLIF(club, ''), 'БК «Кузня» (Анапа / Краснодар)'),
  weight_class = COALESCE(
    NULLIF(weight_class, ''),
    'Featherweight 66 кг / Lightweight 70.3 кг'
  ),
  visibility  = COALESCE(visibility, 'public'),
  booking_enabled = COALESCE(booking_enabled, true),
  updated_at  = NOW()
WHERE id = 'WP-INTL-X9-441K';

NOTIFY pgrst, 'reload schema';
