-- Warrior Point · Migration 0031 — profiles_public gets everything the card
-- needs + stop avatar photos from expiring
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why: /fighter/[slug] was reading `public.profiles` directly with the anon
-- key. After 0023_fix_rls_lockdown.sql (REVOKE ALL ... FROM anon) every
-- single card load started failing with a permission error, and the app
-- code silently swallowed that error and rendered a hardcoded demo fixture
-- instead (see lib/fighter-public.ts — fixed in the same commit as this
-- migration to read through `profiles_public` and surface real read
-- failures instead of faking a card). This migration is the DB half: add
-- the columns the card actually needs to the view, and make the avatar
-- photo URL stop expiring.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. profiles_public: add role / nickname / donation_goal ────────────────
--
-- Unmasked (unlike bio/record/club/weight_class, which stay gated by
-- visibility/hide_*):
--   · role           — the coach/fighter badge on the card is meant to be
--                       public, same as a job title. Nothing here lets a
--                       viewer claim someone else's role for themselves —
--                       that was a separate app-level bug (untrusted
--                       actorId in app/api/fighter/[slug]/route.ts),
--                       already fixed independently, unrelated to this view.
--   · nickname       — a display-name variant, same visibility as
--                       display_name itself (always shown).
--   · donation_goal  — tied to the donations feature, which is already
--                       shown unconditionally (see publicCardViewFor()'s
--                       showDonations: true even in minimal mode).

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  display_name,
  slug,
  role,
  nickname,
  donation_goal,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_bio, false)
       THEN bio ELSE NULL END AS bio,
  avatar_url,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_record, false)
       THEN record ELSE NULL END AS record,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_club, false)
       THEN club ELSE NULL END AS club,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_weight_class, false)
       THEN weight_class ELSE NULL END AS weight_class,
  donations_total,
  (COALESCE(visibility, 'public') = 'public' AND COALESCE(booking_enabled, true)) AS booking_enabled,
  visibility,
  hide_weight_class,
  hide_club,
  hide_bio,
  hide_record,
  verification_status,
  created_at,
  updated_at
FROM public.profiles
WHERE COALESCE(visibility, 'public') IN ('public', 'limited')
  AND COALESCE(fighter_status, '') <> 'Deleted';
-- balance / coach_earnings / iphone_tickets / coach_id / specialization
-- still intentionally excluded — no card needs them.

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ── 2. Stop avatar photos from expiring ─────────────────────────────────────
--
-- Any `avatar_url` currently pointing at a Supabase Storage SIGNED url
-- (".../storage/v1/object/sign/<bucket>/<path>?token=...") will 404 once
-- the token expires — that's what happened to Романов's photo. Public
-- profile photos don't need to be behind a signed URL at all: make the
-- referenced bucket(s) public and rewrite the URL to the stable
-- ".../object/public/..." form (no token, never expires).
--
-- ⚠️ This makes the WHOLE bucket publicly readable (anyone with a direct
-- object URL can fetch it — still not listable/enumerable without knowing
-- exact paths). If any bucket referenced by an avatar_url also stores
-- non-public files, check `SELECT id FROM storage.buckets` and adjust the
-- WHERE below before running this in production.

DO $$
DECLARE
  bkt TEXT;
BEGIN
  FOR bkt IN
    SELECT DISTINCT split_part(split_part(avatar_url, '/object/sign/', 2), '/', 1)
    FROM public.profiles
    WHERE avatar_url LIKE '%/storage/v1/object/sign/%'
  LOOP
    IF bkt IS NOT NULL AND bkt <> '' THEN
      UPDATE storage.buckets SET public = true WHERE id = bkt;
    END IF;
  END LOOP;
END $$;

UPDATE public.profiles
SET
  avatar_url = regexp_replace(
    split_part(avatar_url, '?', 1),
    '/storage/v1/object/sign/', '/storage/v1/object/public/'
  ),
  updated_at = NOW()
WHERE avatar_url LIKE '%/storage/v1/object/sign/%';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- Verification (read-only, run separately):
--   SELECT id, slug, avatar_url FROM public.profiles WHERE slug = 'romanov';
--   SELECT id, public FROM storage.buckets;
-- ─────────────────────────────────────────────────────────────────────────
