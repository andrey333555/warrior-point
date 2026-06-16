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
