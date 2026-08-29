-- Warrior Point · Migration 0023 — Security hardening (idempotent)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Closes: fake paymentId XP mint, replay training sessions, wallet races,
-- leftover FOR ALL RLS (reviews), missing search_path, public money columns.
-- Commission 19/81 and Fibonacci rounds are unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1 ── payment_intents: consume flags + unique YooKassa id ───────────────────

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS rewards_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cashback_applied_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_yookassa_uidx
  ON public.payment_intents (yookassa_id)
  WHERE yookassa_id IS NOT NULL AND length(yookassa_id) > 0;

-- 2 ── training_sessions: one reward per source id ───────────────────────────

ALTER TABLE public.fighter_stats
  ADD COLUMN IF NOT EXISTS career_gross_rub BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS career_commission_rub BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS career_net_rub BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sessions_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS fixation_session_key TEXT,
  ADD COLUMN IF NOT EXISTS split_booking_id UUID,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS training_sessions_source_uidx
  ON public.training_sessions (source, source_id)
  WHERE source IS NOT NULL AND source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS training_sessions_payment_uidx
  ON public.training_sessions (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS training_sessions_fixation_uidx
  ON public.training_sessions (fixation_session_key)
  WHERE fixation_session_key IS NOT NULL;

-- 3 ── training XP (mirrors lib/economy.ts recordTrainingSessionRub) ─────────

CREATE OR REPLACE FUNCTION public.wp_training_xp_from_gross_rub(p_gross_rub BIGINT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (
    110 + ROUND(
      (GREATEST(0, COALESCE(p_gross_rub, 0))
        - ROUND(GREATEST(0, COALESCE(p_gross_rub, 0)) * 19 / 100.0)
      ) / 25.0
    )
  )::INTEGER;
$$;

CREATE OR REPLACE FUNCTION public.wp_split_commission(p_gross_rub BIGINT)
RETURNS BIGINT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ROUND(GREATEST(0, COALESCE(p_gross_rub, 0)) * 19 / 100.0)::BIGINT;
$$;

-- 4 ── atomic XP + ledger insert (THE single training mint) ──────────────────

CREATE OR REPLACE FUNCTION public.wp_record_training_once(
  p_fighter_id TEXT,
  p_gross_rub BIGINT,
  p_source TEXT,
  p_source_id TEXT,
  p_session_type TEXT DEFAULT 'training',
  p_created_at TIMESTAMPTZ DEFAULT NOW(),
  p_payment_id TEXT DEFAULT NULL,
  p_fixation_session_key TEXT DEFAULT NULL,
  p_split_booking_id UUID DEFAULT NULL,
  p_coach_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  ok               BOOLEAN,
  already_granted  BOOLEAN,
  xp_awarded       INTEGER,
  total_xp_after   BIGINT,
  level_before     INTEGER,
  level_after      INTEGER,
  monthly_xp_after BIGINT,
  message          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross     BIGINT := GREATEST(0, COALESCE(p_gross_rub, 0));
  v_commission BIGINT;
  v_net       BIGINT;
  v_xp        INTEGER;
  v_total_before BIGINT := 0;
  v_monthly_before BIGINT := 0;
  v_total_after BIGINT;
  v_monthly_after BIGINT;
  v_level_before INTEGER;
  v_level_after INTEGER;
BEGIN
  IF p_fighter_id IS NULL OR length(trim(p_fighter_id)) = 0 THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, NULL::INTEGER, NULL::INTEGER, NULL::BIGINT,
      'fighter_id required'::TEXT;
    RETURN;
  END IF;

  IF p_source IS NULL OR p_source_id IS NULL OR length(trim(p_source_id)) = 0 THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, NULL::INTEGER, NULL::INTEGER, NULL::BIGINT,
      'source required'::TEXT;
    RETURN;
  END IF;

  IF v_gross <= 0 OR v_gross > 100000 THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, NULL::INTEGER, NULL::INTEGER, NULL::BIGINT,
      'invalid gross'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.training_sessions ts
    WHERE ts.source = p_source AND ts.source_id = p_source_id
  ) THEN
    RETURN QUERY SELECT true, true, 0, NULL::BIGINT, NULL::INTEGER, NULL::INTEGER, NULL::BIGINT,
      'already granted'::TEXT;
    RETURN;
  END IF;

  v_commission := public.wp_split_commission(v_gross);
  v_net := v_gross - v_commission;
  v_xp := public.wp_training_xp_from_gross_rub(v_gross);

  SELECT COALESCE(fs.total_xp, 0), COALESCE(fs.monthly_xp, 0)
  INTO v_total_before, v_monthly_before
  FROM public.fighter_stats fs
  WHERE fs.fighter_id = p_fighter_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_total_before := 0;
    v_monthly_before := 0;
  END IF;

  v_level_before := public.wp_derive_level(v_total_before);
  v_total_after := v_total_before + v_xp;
  v_monthly_after := v_monthly_before + v_xp;
  v_level_after := public.wp_derive_level(v_total_after);

  INSERT INTO public.training_sessions (
    fighter_id, coach_id, gross_amount, commission_pct, commission, net_amount,
    xp_awarded, level_before, level_after, total_xp_after, levels_gained,
    session_type, currency, created_at,
    payment_id, fixation_session_key, split_booking_id, source, source_id
  ) VALUES (
    p_fighter_id, p_coach_id, v_gross, 19, v_commission, v_net,
    v_xp, v_level_before, v_level_after, v_total_after, GREATEST(0, v_level_after - v_level_before),
    COALESCE(p_session_type, 'training'), 'RUB', COALESCE(p_created_at, NOW()),
    p_payment_id, p_fixation_session_key, p_split_booking_id, p_source, p_source_id
  );

  INSERT INTO public.fighter_stats AS fs (
    fighter_id, total_xp, current_level, monthly_xp, last_session_at, updated_at,
    career_gross_rub, career_commission_rub, career_net_rub, sessions_count
  ) VALUES (
    p_fighter_id, v_total_after, v_level_after, v_monthly_after,
    COALESCE(p_created_at, NOW()), NOW(),
    v_gross, v_commission, v_net, 1
  )
  ON CONFLICT (fighter_id) DO UPDATE
  SET
    total_xp = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    monthly_xp = EXCLUDED.monthly_xp,
    last_session_at = EXCLUDED.last_session_at,
    updated_at = EXCLUDED.updated_at,
    career_gross_rub = COALESCE(fs.career_gross_rub, 0) + v_gross,
    career_commission_rub = COALESCE(fs.career_commission_rub, 0) + v_commission,
    career_net_rub = COALESCE(fs.career_net_rub, 0) + v_net,
    sessions_count = COALESCE(fs.sessions_count, 0) + 1;

  RETURN QUERY SELECT true, false, v_xp, v_total_after, v_level_before, v_level_after, v_monthly_after,
    'granted'::TEXT;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT true, true, 0, NULL::BIGINT, NULL::INTEGER, NULL::INTEGER, NULL::BIGINT,
      'already granted'::TEXT;
END;
$$;

-- 5 ── apply payment rewards once (webhook + session/complete) ───────────────

CREATE OR REPLACE FUNCTION public.apply_payment_rewards(p_payment_id TEXT)
RETURNS TABLE (
  ok              BOOLEAN,
  already_granted BOOLEAN,
  xp_awarded      INTEGER,
  cashback_rub    BIGINT,
  gross_rub       BIGINT,
  fighter_id      TEXT,
  total_xp_after  BIGINT,
  level_after     INTEGER,
  message         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_train RECORD;
  v_cashback BIGINT;
  v_new_balance BIGINT;
BEGIN
  IF p_payment_id IS NULL OR length(trim(p_payment_id)) = 0 THEN
    RETURN QUERY SELECT false, false, 0, 0::BIGINT, 0::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::INTEGER,
      'payment_id required'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_intent
  FROM public.payment_intents
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 0, 0::BIGINT, 0::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::INTEGER,
      'payment not found'::TEXT;
    RETURN;
  END IF;

  IF v_intent.status IS DISTINCT FROM 'succeeded' THEN
    RETURN QUERY SELECT false, false, 0, 0::BIGINT, v_intent.gross_rub, v_intent.fighter_id,
      NULL::BIGINT, NULL::INTEGER, 'payment not succeeded'::TEXT;
    RETURN;
  END IF;

  IF v_intent.fighter_id IS NULL OR length(trim(v_intent.fighter_id)) = 0 THEN
    RETURN QUERY SELECT false, false, 0, 0::BIGINT, v_intent.gross_rub, NULL::TEXT,
      NULL::BIGINT, NULL::INTEGER, 'payment missing fighter'::TEXT;
    RETURN;
  END IF;

  v_cashback := ROUND(v_intent.gross_rub * 5 / 100.0)::BIGINT;

  IF v_intent.rewards_applied_at IS NOT NULL THEN
    RETURN QUERY SELECT true, true, 0, v_cashback, v_intent.gross_rub, v_intent.fighter_id,
      NULL::BIGINT, NULL::INTEGER, 'already granted'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_train
  FROM public.wp_record_training_once(
    v_intent.fighter_id,
    v_intent.gross_rub,
    'payment',
    v_intent.id,
    'marketplace_booking',
    NOW(),
    v_intent.id,
    NULL,
    NULL,
    NULL
  );

  IF NOT v_train.ok THEN
    RETURN QUERY SELECT false, false, 0, 0::BIGINT, v_intent.gross_rub, v_intent.fighter_id,
      NULL::BIGINT, NULL::INTEGER, COALESCE(v_train.message, 'xp failed')::TEXT;
    RETURN;
  END IF;

  IF v_cashback > 0 AND v_intent.cashback_applied_at IS NULL THEN
    UPDATE public.profiles
    SET
      balance = COALESCE(balance, 0) + v_cashback,
      updated_at = NOW()
    WHERE id = v_intent.fighter_id;
    GET DIAGNOSTICS v_new_balance = ROW_COUNT;
  END IF;

  UPDATE public.payment_intents
  SET
    rewards_applied_at = NOW(),
    cashback_applied_at = CASE
      WHEN cashback_applied_at IS NULL THEN NOW()
      ELSE cashback_applied_at
    END
  WHERE id = p_payment_id
    AND rewards_applied_at IS NULL;

  RETURN QUERY SELECT true, COALESCE(v_train.already_granted, false), COALESCE(v_train.xp_awarded, 0),
    v_cashback, v_intent.gross_rub, v_intent.fighter_id,
    v_train.total_xp_after, v_train.level_after, 'granted'::TEXT;
END;
$$;

-- 6 ── atomic split booking (seat + wallet + XP) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.book_split_atomic(
  p_client_id TEXT,
  p_split_id UUID,
  p_gross_rub BIGINT DEFAULT 2000
)
RETURNS TABLE (
  ok              BOOLEAN,
  code            TEXT,
  booked_count    INTEGER,
  activated       BOOLEAN,
  new_balance     BIGINT,
  daily_streak    INTEGER,
  iphone_tickets  INTEGER,
  xp_awarded      INTEGER,
  message         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split public.training_splits%ROWTYPE;
  v_booked INTEGER;
  v_balance BIGINT;
  v_tickets INTEGER;
  v_net BIGINT;
  v_commission BIGINT;
  v_booking_id UUID;
  v_train RECORD;
  v_activated BOOLEAN := false;
  v_streak INTEGER := 0;
  v_last TIMESTAMPTZ;
BEGIN
  IF p_client_id IS NULL OR length(trim(p_client_id)) = 0 THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED', 0, false, 0::BIGINT, 0, 0, 0, 'login required'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_split
  FROM public.training_splits
  WHERE id = p_split_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NOT_FOUND', 0, false, 0::BIGINT, 0, 0, 0, 'split not found'::TEXT;
    RETURN;
  END IF;

  IF v_split.status IN ('done', 'cancelled') THEN
    RETURN QUERY SELECT false, 'NOT_FOUND', 0, false, 0::BIGINT, 0, 0, 0, 'split closed'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.split_bookings
    WHERE split_id = p_split_id AND fighter_id = p_client_id
  ) THEN
    RETURN QUERY SELECT false, 'ALREADY_BOOKED', 0, false, 0::BIGINT, 0, 0, 0, 'already booked'::TEXT;
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_booked
  FROM public.split_bookings
  WHERE split_id = p_split_id;

  IF v_booked >= COALESCE(v_split.max_seats, 6) THEN
    RETURN QUERY SELECT false, 'FULL', v_booked, false, 0::BIGINT, 0, 0, 0, 'full'::TEXT;
    RETURN;
  END IF;

  SELECT COALESCE(balance, 0), COALESCE(iphone_tickets, 0)
  INTO v_balance, v_tickets
  FROM public.profiles
  WHERE id = p_client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED', 0, false, 0::BIGINT, 0, 0, 0, 'profile not found'::TEXT;
    RETURN;
  END IF;

  IF v_balance < p_gross_rub THEN
    RETURN QUERY SELECT false, 'INSUFFICIENT_BALANCE', v_booked, false, v_balance, 0, v_tickets, 0,
      'insufficient balance'::TEXT;
    RETURN;
  END IF;

  v_commission := public.wp_split_commission(p_gross_rub);
  v_net := p_gross_rub - v_commission;

  UPDATE public.profiles
  SET
    balance = v_balance - p_gross_rub,
    iphone_tickets = v_tickets + 1,
    updated_at = NOW()
  WHERE id = p_client_id;

  v_balance := v_balance - p_gross_rub;
  v_tickets := v_tickets + 1;

  UPDATE public.profiles
  SET
    coach_earnings = COALESCE(coach_earnings, 0) + v_net,
    updated_at = NOW()
  WHERE id = v_split.coach_id;

  INSERT INTO public.split_bookings (split_id, fighter_id, gross_amount, verified)
  VALUES (p_split_id, p_client_id, p_gross_rub, true)
  RETURNING id INTO v_booking_id;

  v_booked := v_booked + 1;

  IF v_booked >= 4 AND v_split.status = 'waiting' THEN
    UPDATE public.training_splits
    SET status = 'active'
    WHERE id = p_split_id AND status = 'waiting';
    IF FOUND THEN v_activated := true; END IF;
  END IF;

  SELECT COALESCE(daily_streak, 0), last_session_at
  INTO v_streak, v_last
  FROM public.fighter_stats
  WHERE fighter_id = p_client_id
  FOR UPDATE;

  IF v_last IS NULL OR (v_last AT TIME ZONE 'utc')::date IS DISTINCT FROM (NOW() AT TIME ZONE 'utc')::date THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  END IF;

  SELECT * INTO v_train
  FROM public.wp_record_training_once(
    p_client_id,
    p_gross_rub,
    'split',
    v_booking_id::TEXT,
    'split_booking',
    NOW(),
    NULL,
    NULL,
    v_booking_id,
    v_split.coach_id
  );

  UPDATE public.fighter_stats
  SET daily_streak = v_streak, updated_at = NOW()
  WHERE fighter_id = p_client_id;

  RETURN QUERY SELECT true, 'OK', v_booked, v_activated, v_balance, v_streak, v_tickets,
    COALESCE(v_train.xp_awarded, 0), 'booked'::TEXT;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'ALREADY_BOOKED', 0, false, 0::BIGINT, 0, 0, 0, 'already booked'::TEXT;
END;
$$;

-- 7 ── atomic wallet donate ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.wallet_donate_atomic(
  p_donor_id TEXT,
  p_recipient_id TEXT,
  p_gross_rub BIGINT,
  p_comment TEXT DEFAULT NULL
)
RETURNS TABLE (
  ok                BOOLEAN,
  code              TEXT,
  donation_id       UUID,
  new_donor_balance BIGINT,
  message           TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross BIGINT := GREATEST(0, COALESCE(p_gross_rub, 0));
  v_fee BIGINT;
  v_net BIGINT;
  v_balance BIGINT;
  v_id UUID;
  v_comment TEXT := NULLIF(left(trim(COALESCE(p_comment, '')), 280), '');
BEGIN
  IF p_donor_id IS NULL OR length(trim(p_donor_id)) = 0 THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED', NULL::UUID, 0::BIGINT, 'login required'::TEXT;
    RETURN;
  END IF;

  IF p_donor_id = p_recipient_id THEN
    RETURN QUERY SELECT false, 'SELF_DONATE', NULL::UUID, 0::BIGINT, 'self donate'::TEXT;
    RETURN;
  END IF;

  IF v_gross < 50 OR v_gross > 1000000 THEN
    RETURN QUERY SELECT false, 'INVALID_AMOUNT', NULL::UUID, 0::BIGINT, 'invalid amount'::TEXT;
    RETURN;
  END IF;

  v_fee := ROUND(v_gross * 5 / 100.0)::BIGINT;
  v_net := v_gross - v_fee;

  SELECT COALESCE(balance, 0) INTO v_balance
  FROM public.profiles
  WHERE id = p_donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED', NULL::UUID, 0::BIGINT, 'profile not found'::TEXT;
    RETURN;
  END IF;

  IF v_balance < v_gross THEN
    RETURN QUERY SELECT false, 'INSUFFICIENT_BALANCE', NULL::UUID, v_balance, 'insufficient balance'::TEXT;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET balance = v_balance - v_gross, updated_at = NOW()
  WHERE id = p_donor_id;

  UPDATE public.profiles
  SET
    balance = COALESCE(balance, 0) + v_net,
    donations_total = COALESCE(donations_total, 0) + (v_gross * 100),
    updated_at = NOW()
  WHERE id = p_recipient_id;

  INSERT INTO public.donations (
    donor_id, recipient_id, fighter_id, amount, currency, status, message,
    gross_amount, platform_fee, net_amount, comment
  ) VALUES (
    p_donor_id, p_recipient_id, p_recipient_id, v_gross * 100, 'RUB', 'paid', v_comment,
    v_gross, v_fee, v_net, v_comment
  )
  RETURNING id INTO v_id;

  PERFORM public.grant_donation_xp(v_id);

  RETURN QUERY SELECT true, 'OK', v_id, v_balance - v_gross, 'paid'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.wp_record_training_once(TEXT, BIGINT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wp_record_training_once(TEXT, BIGINT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wp_record_training_once(TEXT, BIGINT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.apply_payment_rewards(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_payment_rewards(TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_rewards(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.book_split_atomic(TEXT, UUID, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_split_atomic(TEXT, UUID, BIGINT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_split_atomic(TEXT, UUID, BIGINT) TO service_role;

REVOKE ALL ON FUNCTION public.wallet_donate_atomic(TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_donate_atomic(TEXT, TEXT, BIGINT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_donate_atomic(TEXT, TEXT, BIGINT, TEXT) TO service_role;

-- 8 ── leaderboard search_path ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_monthly_xp_leaders(
  days_back INTEGER DEFAULT 30,
  top_n     INTEGER DEFAULT 10
)
RETURNS TABLE (
  fighter_id     TEXT,
  xp_30d         BIGINT,
  sessions_30d   BIGINT,
  current_status TEXT,
  is_winner      BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ts.fighter_id,
    SUM(ts.xp_awarded)                                        AS xp_30d,
    COUNT(*)                                                  AS sessions_30d,
    fs.current_status,
    COALESCE(fs.is_winner, FALSE)                             AS is_winner
  FROM public.training_sessions ts
  LEFT JOIN public.fighter_stats fs
         ON fs.fighter_id = ts.fighter_id
  WHERE ts.created_at > (NOW() - (days_back || ' days')::INTERVAL)
  GROUP BY ts.fighter_id, fs.current_status, fs.is_winner
  ORDER BY xp_30d DESC
  LIMIT top_n;
$$;

-- 9 ── RLS leftovers (reviews table is `reviews`, not fighter_reviews) ───────

DROP POLICY IF EXISTS "warrior_anon_reviews_all" ON public.reviews;
DROP POLICY IF EXISTS "warrior_reviews_anon_all" ON public.reviews;
DROP POLICY IF EXISTS "warrior_anon_reviews_select" ON public.reviews;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reviews'
  ) THEN
    EXECUTE 'ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$
      CREATE POLICY "warrior_anon_reviews_select"
        ON public.reviews
        FOR SELECT
        TO anon
        USING (status = 'published')
    $p$;
  END IF;
END $$;

-- Drop any remaining blanket write policies by name
DROP POLICY IF EXISTS "warrior_anon_profiles_write" ON public.profiles;
DROP POLICY IF EXISTS "warrior_anon_profiles_all" ON public.profiles;
DROP POLICY IF EXISTS "warrior_anon_splits_all" ON public.training_splits;
DROP POLICY IF EXISTS "warrior_anon_split_bookings_all" ON public.split_bookings;
DROP POLICY IF EXISTS "warrior_anon_donations_all" ON public.donations;
DROP POLICY IF EXISTS "warrior_anon_fighter_orgs_all" ON public.fighter_orgs;

-- Financial tables: no public SELECT of the full ledger
DROP POLICY IF EXISTS "warrior_anon_training_sessions_select" ON public.training_sessions;
CREATE POLICY "warrior_anon_training_sessions_select"
  ON public.training_sessions
  FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS "warrior_anon_donations_select" ON public.donations;
CREATE POLICY "warrior_anon_donations_select"
  ON public.donations
  FOR SELECT
  TO anon
  USING (false);

-- split_bookings: read needed for the public board (seat counts). Writes stay server-only.
DROP POLICY IF EXISTS "warrior_anon_split_bookings_select" ON public.split_bookings;
CREATE POLICY "warrior_anon_split_bookings_select"
  ON public.split_bookings
  FOR SELECT
  TO anon
  USING (true);

CREATE OR REPLACE VIEW public.donations_public AS
SELECT
  id,
  recipient_id,
  fighter_id,
  COALESCE(net_amount, 0) AS net_amount,
  COALESCE(gross_amount, 0) AS gross_amount,
  supporter_name,
  created_at
FROM public.donations
WHERE COALESCE(status, 'paid') = 'paid';

GRANT SELECT ON public.donations_public TO anon;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER VIEW public.donations_public SET (security_invoker = false)';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

REVOKE ALL ON public.payment_intents FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'balance'
  ) THEN
    EXECUTE 'REVOKE SELECT (balance) ON public.profiles FROM anon';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'coach_earnings'
  ) THEN
    EXECUTE 'REVOKE SELECT (coach_earnings) ON public.profiles FROM anon';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'iphone_tickets'
  ) THEN
    EXECUTE 'REVOKE SELECT (iphone_tickets) ON public.profiles FROM anon';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
