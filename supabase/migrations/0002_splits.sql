-- Warrior Point · Day-2 migration — Battle BlaBlaCar (Splits)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent (safe to re-run).
-- ------------------------------------------------------------

-- ── training_splits ───────────────────────────────────────────────────────
-- A coach creates a group session with N seats. Status lifecycle:
--   waiting  → not enough bookings yet (< min_seats)
--   active   → min_seats reached, session is confirmed
--   done     → completed
--   cancelled→ cancelled by coach

CREATE TABLE IF NOT EXISTS public.training_splits (
  id             UUID     PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  coach_id       TEXT     NOT NULL,
  topic          TEXT     NOT NULL,
  price_per_seat BIGINT   NOT NULL DEFAULT 0,       -- in whole RUB
  max_seats      SMALLINT NOT NULL DEFAULT 6
                   CHECK (max_seats BETWEEN 4 AND 6),
  min_seats      SMALLINT NOT NULL DEFAULT 4,
  status         TEXT     NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting', 'active', 'done', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  starts_at      TIMESTAMPTZ
);

-- ── split_bookings ─────────────────────────────────────────────────────────
-- One row per fighter per split. UNIQUE prevents double-booking.

CREATE TABLE IF NOT EXISTS public.split_bookings (
  id         UUID     PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  split_id   UUID     NOT NULL REFERENCES public.training_splits(id) ON DELETE CASCADE,
  fighter_id TEXT     NOT NULL,
  booked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (split_id, fighter_id)
);

CREATE INDEX IF NOT EXISTS split_bookings_split_idx
  ON public.split_bookings (split_id);
CREATE INDEX IF NOT EXISTS split_bookings_fighter_idx
  ON public.split_bookings (fighter_id);
CREATE INDEX IF NOT EXISTS training_splits_status_idx
  ON public.training_splits (status, created_at DESC);

ALTER TABLE public.training_splits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_bookings   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_splits_all"         ON public.training_splits;
DROP POLICY IF EXISTS "warrior_anon_split_bookings_all" ON public.split_bookings;

CREATE POLICY "warrior_anon_splits_all"
  ON public.training_splits FOR ALL TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "warrior_anon_split_bookings_all"
  ON public.split_bookings FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- Refresh PostgREST schema cache.
NOTIFY pgrst, 'reload schema';
