-- Warrior Point · Migration 0015 — Public fighter profile + donations
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run (ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS).
--
-- Note: `bio` may already exist (0005). `donations` may already exist (0010) with
-- donor_id / recipient_id / gross_amount. This migration adds public-profile
-- columns and the newer donation fields without dropping the legacy ledger.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. profiles — public link fields ─────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug             TEXT,
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS record           TEXT,
  ADD COLUMN IF NOT EXISTS donations_total  BIGINT NOT NULL DEFAULT 0;

-- Human-readable public URL id (e.g. /fighter/kolesnik). Multiple NULLs allowed.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_uidx
  ON public.profiles (slug);

-- ── 2. donations — create if missing, then ensure columns on legacy installs ─

CREATE TABLE IF NOT EXISTS public.donations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_id      TEXT        NOT NULL,
  amount          BIGINT      NOT NULL,              -- kopecks
  currency        TEXT        NOT NULL DEFAULT 'RUB',
  supporter_name  TEXT,
  message         TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade installs that already have 0010 ledger shape:
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS fighter_id      TEXT,
  ADD COLUMN IF NOT EXISTS amount          BIGINT,
  ADD COLUMN IF NOT EXISTS currency        TEXT DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS supporter_name  TEXT,
  ADD COLUMN IF NOT EXISTS message         TEXT,
  ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ DEFAULT NOW();

-- Soft defaults for rows that predate these columns (legacy 0010 rows).
-- Only touches installs that still have recipient_id / gross_amount.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'donations'
      AND column_name = 'recipient_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'donations'
      AND column_name = 'gross_amount'
  ) THEN
    EXECUTE $u$
      UPDATE public.donations
      SET
        fighter_id = COALESCE(fighter_id, recipient_id),
        amount     = COALESCE(amount, gross_amount * 100),
        currency   = COALESCE(currency, 'RUB'),
        status     = COALESCE(status, 'paid'),
        created_at = COALESCE(created_at, NOW())
      WHERE fighter_id IS NULL
         OR amount IS NULL
         OR currency IS NULL
         OR status IS NULL
         OR created_at IS NULL
    $u$;
  ELSE
    UPDATE public.donations
    SET
      currency   = COALESCE(currency, 'RUB'),
      status     = COALESCE(status, 'pending'),
      created_at = COALESCE(created_at, NOW())
    WHERE currency IS NULL
       OR status IS NULL
       OR created_at IS NULL;
  END IF;
END $$;

-- Enforce status whitelist (NULL allowed on upgraded rows that never got a value).
ALTER TABLE public.donations
  DROP CONSTRAINT IF EXISTS donations_status_check;
ALTER TABLE public.donations
  ADD CONSTRAINT donations_status_check
  CHECK (status IS NULL OR status IN ('pending', 'paid', 'failed'));

CREATE INDEX IF NOT EXISTS donations_fighter_created_idx
  ON public.donations (fighter_id, created_at DESC);

-- Open anon policies (demo MVP style — same spirit as schema.sql)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_donations_all" ON public.donations;
CREATE POLICY "warrior_anon_donations_all"
  ON public.donations
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── 3. Seed public slug for showcase fighter ─────────────────────────────────

UPDATE public.profiles
SET
  slug       = 'kolesnik',
  updated_at = NOW()
WHERE id = 'WP-INTL-X9-441K';

NOTIFY pgrst, 'reload schema';
