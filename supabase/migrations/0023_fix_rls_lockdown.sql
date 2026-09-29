-- Warrior Point · Migration 0023 — Fix RLS lockdown (supersedes broken 0020)
--                                  + fold in prod's grant_donation_xp hotfix
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why: 0020 never applied cleanly on prod —
--   1. its "reviews" block targets a nonexistent table `public.fighter_reviews`
--      (the real table, created in 0017, is `public.reviews`) — the whole
--      script errors out on that statement (and, run as one paste in SQL
--      Editor, rolls back everything before it in the same transaction);
--   2. even fixed, its "training_splits" block drops a policy name
--      (`warrior_anon_training_splits_all`) that was never created — the
--      real permissive policy from 0002 is named `warrior_anon_splits_all`,
--      so it would have stayed active.
-- Prod also has anon/public policies created ad hoc via the Dashboard UI
-- that don't match ANY name from the migrations (e.g. "Public Update
-- Stats", "Enable insert for all users") — a fixed name-based DROP list
-- would still miss those. So instead of names, this migration sweeps by
-- querying pg_policies directly: every anon/public policy on the listed
-- tables is dropped, whatever it's called, then only the intended
-- read-only policies are (re)created.
--
-- profiles gets tighter treatment: balance / coach_earnings / iphone_tickets
-- / role / coach_id are no longer selectable by anon at all (RLS is
-- row-level only, it can't hide columns) — anon reads through the new
-- `profiles_public` view instead, which also bakes in the same
-- visibility / hide_* masking the app already applies at the UI layer
-- (see lib/fighter-public.ts publicCardViewFor), so a `visibility='limited'`
-- or `hide_bio`-style row can't be read around by querying PostgREST
-- directly. fights / gyms / sessions are not used anywhere in the app code
-- (grepped app/ + components/ + lib/) — swept and left with zero policies,
-- i.e. fully closed to anon/authenticated.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Sweep: drop every anon/public policy on the tables we manage ────────
-- (Policies not covering anon/public — e.g. payment_intents' USING(false)
-- policy for anon+authenticated — are also swept here since that policy is
-- itself getting recreated explicitly below; harmless either way.)

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
        'reviews', 'payment_intents', 'fights', 'gyms', 'sessions'
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

-- ── 2. profiles — no anon table access at all; safe view instead ───────────

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
-- balance / coach_earnings / iphone_tickets / role / coach_id / specialization
-- / fighter_status are intentionally NOT exposed here. The public fighter
-- card's role badge is rendered server-side (SSR, service-role client —
-- bypasses this view entirely); nothing in the app needs anon to read role
-- directly any more (see app/api/profile/me for the session-bound version).

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ── 3. Read-only anon policies, per table, only if the table exists ────────

DO $$ BEGIN
  IF to_regclass('public.fighter_stats') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_stats_select"
      ON public.fighter_stats FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.training_sessions') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_training_sessions_select"
      ON public.training_sessions FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.fighter_awards') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_awards_select"
      ON public.fighter_awards FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.donations') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_donations_select"
      ON public.donations FOR SELECT TO anon USING (true);
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

DO $$ BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_reviews_select"
      ON public.reviews FOR SELECT TO anon USING (true);
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

-- fights / gyms / sessions: not referenced anywhere in app code — swept
-- above, no policy re-created here → RLS enabled + zero policies = fully
-- closed to anon and authenticated. Service role is unaffected either way.

NOTIFY pgrst, 'reload schema';

-- ── 4. Day-2 hotfix folded in: grant_donation_xp() ambiguous fighter_id ────
--
-- Prod carries a hand-patched version of this function (applied directly
-- via SQL Editor on Day 2, never committed) that renames the RETURNS TABLE
-- column `fighter_id` → `out_fighter_id` to fix "column reference
-- fighter_id is ambiguous". 0021_donation_xp.sql in this repo still has the
-- original `fighter_id` column name — re-running it as-is on prod fails
-- with "cannot change return type of existing function
-- grant_donation_xp(uuid)", which also aborts everything after it in the
-- same paste (see supabase/prod-catchup.sql, which additionally DROPs this
-- function — and wp_derive_level / wp_donation_xp_from_gross_rub, same file,
-- same risk class — right before 0021's own CREATE, so that statement
-- doesn't abort the script before ever reaching this corrected version).
--
-- Nothing in the JS caller (lib/supabase/donations.ts grantDonationXpOnce)
-- reads the RPC result's columns by name — it only checks `error` — so this
-- rename is safe app-side. Body is otherwise identical to 0021's.

DROP FUNCTION IF EXISTS public.grant_donation_xp(UUID);

CREATE OR REPLACE FUNCTION public.grant_donation_xp(p_donation_id UUID)
RETURNS TABLE (
  ok              BOOLEAN,
  already_granted BOOLEAN,
  xp_awarded      INTEGER,
  out_fighter_id  TEXT,
  total_xp_after  BIGINT,
  level_after     INTEGER,
  message         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fighter_id     TEXT;
  v_gross_rub      BIGINT;
  v_xp             INTEGER;
  v_rows           INTEGER;
  v_total_before   BIGINT;
  v_monthly_before BIGINT;
  v_total_after    BIGINT;
  v_monthly_after  BIGINT;
  v_level_after    INTEGER;
BEGIN
  SELECT
    COALESCE(d.fighter_id, d.recipient_id),
    COALESCE(
      d.gross_amount,
      CASE
        WHEN d.amount IS NOT NULL THEN FLOOR(d.amount / 100.0)::BIGINT
        ELSE NULL
      END
    )
  INTO v_fighter_id, v_gross_rub
  FROM public.donations d
  WHERE d.id = p_donation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, false, 0, NULL::TEXT, NULL::BIGINT, NULL::INTEGER,
      'donation not found'::TEXT;
    RETURN;
  END IF;

  IF v_fighter_id IS NULL OR v_gross_rub IS NULL OR v_gross_rub <= 0 THEN
    RETURN QUERY SELECT
      false, false, 0, v_fighter_id, NULL::BIGINT, NULL::INTEGER,
      'donation missing fighter_id or gross'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.donations d
    WHERE d.id = p_donation_id AND d.status = 'paid'
  ) THEN
    RETURN QUERY SELECT
      false, false, 0, v_fighter_id, NULL::BIGINT, NULL::INTEGER,
      'donation not paid — XP deferred until status=paid'::TEXT;
    RETURN;
  END IF;

  v_xp := public.wp_donation_xp_from_gross_rub(v_gross_rub);

  UPDATE public.donations d
  SET
    xp_granted = true,
    xp_awarded = v_xp
  WHERE d.id = p_donation_id
    AND d.xp_granted = false
    AND d.status = 'paid';

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN QUERY
    SELECT
      true,
      true,
      d.xp_awarded,
      COALESCE(d.fighter_id, d.recipient_id),
      NULL::BIGINT,
      NULL::INTEGER,
      'already granted'::TEXT
    FROM public.donations d
    WHERE d.id = p_donation_id;
    RETURN;
  END IF;

  SELECT
    COALESCE(fs.total_xp, 0),
    COALESCE(fs.monthly_xp, 0)
  INTO v_total_before, v_monthly_before
  FROM public.fighter_stats fs
  WHERE fs.fighter_id = v_fighter_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_total_before := 0;
    v_monthly_before := 0;
  END IF;

  v_total_after   := v_total_before + v_xp;
  v_monthly_after := v_monthly_before + v_xp;
  v_level_after   := public.wp_derive_level(v_total_after);

  INSERT INTO public.fighter_stats AS fs (
    fighter_id,
    total_xp,
    current_level,
    monthly_xp,
    updated_at
  )
  VALUES (
    v_fighter_id,
    v_total_after,
    v_level_after,
    v_monthly_after,
    NOW()
  )
  ON CONFLICT (fighter_id) DO UPDATE
  SET
    total_xp      = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    monthly_xp    = EXCLUDED.monthly_xp,
    updated_at    = EXCLUDED.updated_at;

  RETURN QUERY SELECT
    true,
    false,
    v_xp,
    v_fighter_id,
    v_total_after,
    v_level_after,
    'granted'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.grant_donation_xp(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_donation_xp(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
