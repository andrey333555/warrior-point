-- Warrior Point · Migration 0016 — Profile privacy, booking toggle, verification
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_enabled     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibility          TEXT    NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS hide_weight_class   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_club           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_bio            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_record         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status TEXT    NOT NULL DEFAULT 'none';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_visibility_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_visibility_check
  CHECK (visibility IN ('public', 'limited', 'private'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));

-- Ensure showcase fighter keeps public slug for /fighter/kolesnik
UPDATE public.profiles
SET
  slug       = COALESCE(slug, 'kolesnik'),
  visibility = COALESCE(visibility, 'public'),
  updated_at = NOW()
WHERE id = 'WP-INTL-X9-441K';

NOTIFY pgrst, 'reload schema';
