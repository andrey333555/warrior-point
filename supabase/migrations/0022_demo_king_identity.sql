-- Warrior Point · Migration 0022 — Ensure demo profile is King León only
-- Idempotent. Safe to re-run after demo identity renames.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
SET
  display_name = 'King León',
  slug         = 'king',
  updated_at   = NOW()
WHERE id = 'WP-INTL-X9-441K'
  AND (
    display_name IS DISTINCT FROM 'King León'
    OR slug IS DISTINCT FROM 'king'
  );

NOTIFY pgrst, 'reload schema';
