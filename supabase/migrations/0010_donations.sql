-- Warrior Point · Migration 0010 — Direct donations / tips (SBP-style flow)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Fundraiser metadata on fighter_stats ─────────────────────────────────

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS fundraiser_title    TEXT,
  ADD COLUMN IF NOT EXISTS fundraiser_goal_rub BIGINT NOT NULL DEFAULT 0;

-- ── 2. donations ledger ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.donations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id       TEXT        NOT NULL,
  recipient_id   TEXT        NOT NULL,
  gross_amount   BIGINT      NOT NULL CHECK (gross_amount > 0),
  platform_fee   BIGINT      NOT NULL CHECK (platform_fee >= 0),
  net_amount     BIGINT      NOT NULL CHECK (net_amount > 0),
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donations_recipient_created_idx
  ON public.donations (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS donations_donor_created_idx
  ON public.donations (donor_id, created_at DESC);

-- ── 3. Demo seed — Dagestan camp fundraiser for showcase fighter ───────────

UPDATE public.fighter_stats
SET
  fundraiser_title    = 'На сборы в Дагестан',
  fundraiser_goal_rub = 50000
WHERE fighter_id = 'WP-INTL-X9-441K';

-- Showcase seed donation (300 ₽ net credited toward Dagestan camp)
INSERT INTO public.donations (
  donor_id, recipient_id, gross_amount, platform_fee, net_amount, comment
)
SELECT
  'WP-SEED-DONOR',
  'WP-INTL-X9-441K',
  316,
  16,
  300,
  'Удачи на сборах!'
WHERE NOT EXISTS (
  SELECT 1 FROM public.donations
  WHERE recipient_id = 'WP-INTL-X9-441K'
    AND donor_id = 'WP-SEED-DONOR'
);

NOTIFY pgrst, 'reload schema';
