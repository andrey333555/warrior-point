-- Warrior Point · Migration 0030 — Reconcile final lockdown
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why this exists: this branch's own 0023_fix_rls_lockdown.sql and
-- origin/main's 0029_security_hardening.sql (renumbered — was "0023" there,
-- collided with this branch's 0023) both independently tightened RLS after
-- 0020 turned out broken. Applied in sequence, they disagree on the FINAL
-- state of a few tables:
--   · reviews            — 0023 here: USING(true). 0029: USING(status='published').
--   · training_sessions  — 0023 here: USING(true). 0029: USING(false)
--     (financial columns — public read is now via a view instead).
--   · donations          — same story; 0029 adds a donations_public view.
--   · gyms (new in 0028) — doesn't exist when 0023 here was written, so
--     0023's table sweep includes "gyms" with no matching recreate branch.
--     If 0023_fix_rls_lockdown.sql is ever re-run in isolation AFTER 0028,
--     it silently re-closes gyms and breaks the gym map/catalog.
--
-- This migration is the actual final word: same dynamic pg_policies sweep
-- mechanism as 0023_fix_rls_lockdown.sql (robust against arbitrary ad hoc
-- Dashboard-created policies, whatever they're named), extended to cover
-- the tables 0026-0028 introduced, with each table's policy set to the
-- correct — and where the two prior migrations disagreed, the STRICTER —
-- final definition.
--
-- ⚠️ After this runs: 0023_fix_rls_lockdown.sql must never be re-run in
-- isolation again — it would reopen reviews/training_sessions/donations and
-- re-close gyms, as described above. This file (0030) is what "re-apply the
-- lockdown" should mean from now on; re-running THIS one is always safe.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Sweep: drop every anon/public policy on every table we manage ───────

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'profiles', 'fighter_stats', 'training_sessions', 'fighter_awards',
        'donations', 'training_splits', 'split_bookings', 'fighter_orgs',
        'reviews', 'payment_intents', 'fights', 'gyms', 'sessions',
        'fighter_invite_drafts', 'invites', 'user_bonuses'
      ])
      AND (
        roles @> ARRAY['anon']::name[]
        OR roles @> ARRAY['public']::name[]
        OR roles @> ARRAY['authenticated']::name[]
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ── 2. profiles — unchanged from 0023: no anon table access, view instead ──

REVOKE ALL ON public.profiles FROM anon;

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  display_name,
  slug,
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

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ── 3. Per-table final policies (to_regclass-guarded — skip missing tables) ─

DO $$ BEGIN
  IF to_regclass('public.fighter_stats') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_stats_select"
      ON public.fighter_stats FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- training_sessions: financial columns — closed. Was USING(true) in 0023,
-- 0029 tightened to USING(false); that's the final word.
DO $$ BEGIN
  IF to_regclass('public.training_sessions') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_training_sessions_select"
      ON public.training_sessions FOR SELECT TO anon USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.fighter_awards') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_awards_select"
      ON public.fighter_awards FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- donations: financial columns — closed. Public reads go through
-- donations_public (created by 0029_security_hardening.sql).
DO $$ BEGIN
  IF to_regclass('public.donations') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_donations_select"
      ON public.donations FOR SELECT TO anon USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.training_splits') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_training_splits_select"
      ON public.training_splits FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.split_bookings') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_split_bookings_select"
      ON public.split_bookings FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.fighter_orgs') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_orgs_select"
      ON public.fighter_orgs FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- reviews: published only. Was USING(true) in 0023, 0029 tightened to
-- status='published'; that's the final word.
DO $$ BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_reviews_select"
      ON public.reviews FOR SELECT TO anon USING (status = 'published');
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.payment_intents') IS NOT NULL THEN
    CREATE POLICY "payment_intents_no_public"
      ON public.payment_intents FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
    REVOKE ALL ON public.payment_intents FROM anon;
    REVOKE ALL ON public.payment_intents FROM authenticated;
  END IF;
END $$;

-- gyms (0028): real anon-facing feature (map/catalog) — must stay open, or
-- any future re-run of the sweep above silently breaks it.
DO $$ BEGIN
  IF to_regclass('public.gyms') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_gyms_select"
      ON public.gyms FOR SELECT TO anon, authenticated USING (true);
    GRANT SELECT ON public.gyms TO anon, authenticated;
  END IF;
END $$;

-- fighter_invite_drafts / invites / user_bonuses (0026/0027): service_role
-- only, by design — swept above for defense-in-depth, no policy re-created,
-- and explicitly re-REVOKE in case Supabase's default per-table grant to
-- anon/authenticated ever got re-applied by something else.
DO $$ BEGIN
  IF to_regclass('public.fighter_invite_drafts') IS NOT NULL THEN
    REVOKE ALL ON public.fighter_invite_drafts FROM anon, authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.invites') IS NOT NULL THEN
    REVOKE ALL ON public.invites FROM anon, authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.user_bonuses') IS NOT NULL THEN
    REVOKE ALL ON public.user_bonuses FROM anon, authenticated;
  END IF;
END $$;

-- fights / sessions: still not referenced anywhere in app code (rechecked
-- against the full origin/main tree, not just its new files) — swept
-- above, no policy re-created here → RLS enabled + zero policies = fully
-- closed to anon and authenticated. Service role is unaffected either way.

NOTIFY pgrst, 'reload schema';
