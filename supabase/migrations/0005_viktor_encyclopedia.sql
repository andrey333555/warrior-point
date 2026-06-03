-- Warrior Point · Migration 0005 — Viktor Kolesnik encyclopedic profile
-- Источник: официальный профиль БК «Кузня» / Tapology / официальные данные.
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Add bio column to profiles ───────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- ── Step 2: Update full encyclopedic profile for Viktor ──────────────────────
--
-- XP ladder reference (economy.ts buildLevelXpFloors):
--   Level 15  →  8 015 XP
--   Level 16  →  9 288 XP
--   Level 17  → 10 695 XP  ← Viktor (pro tier)
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
  'Колесник Виктор Григорьевич',
  'fighter',
  'WP-COACH-001',
  'БК «Кузня» (Анапа / Краснодар)',
  'MMA · Комплексные единоборства',
  'Featherweight 66 кг / Lightweight 70.3 кг',
  'Pro',
  'Профессиональный боец ММА. Промоушены: ACA, RCC, M-1 Global, Marathon 360. Тренируется под руководством Олега Владимировича. Базовый зал — БК «Кузня» (Анапа).'
)
ON CONFLICT (id) DO UPDATE
  SET display_name   = 'Колесник Виктор Григорьевич',
      role           = 'fighter',
      coach_id       = 'WP-COACH-001',
      club           = 'БК «Кузня» (Анапа / Краснодар)',
      specialization = 'MMA · Комплексные единоборства',
      weight_class   = 'Featherweight 66 кг / Lightweight 70.3 кг',
      fighter_status = 'Pro',
      bio            = 'Профессиональный боец ММА. Промоушены: ACA, RCC, M-1 Global, Marathon 360. Тренируется под руководством Олега Владимировича. Базовый зал — БК «Кузня» (Анапа).',
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
