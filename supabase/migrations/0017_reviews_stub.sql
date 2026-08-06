-- Warrior Point · Migration 0017 — Reviews table stub (→ wire UI later)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type   TEXT        NOT NULL CHECK (target_type IN ('trainer', 'gym', 'fighter')),
  target_id     TEXT        NOT NULL,
  author_id     TEXT        NOT NULL,
  rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT,
  status        TEXT        NOT NULL DEFAULT 'published'
                  CHECK (status IN ('pending', 'published', 'hidden')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_target_created_idx
  ON public.reviews (target_type, target_id, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_reviews_all" ON public.reviews;
CREATE POLICY "warrior_anon_reviews_all"
  ON public.reviews
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
