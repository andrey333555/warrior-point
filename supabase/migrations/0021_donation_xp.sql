-- Warrior Point · Migration 0021 — Donation XP (idempotent, atomic RPC)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- XP formula (gross in RUBLES, not kopecks):
--   xpAward = LEAST(40, 10 + FLOOR(gross_rub / 100))
--   → min 10 XP (any paid tip ≥ 50 ₽), max 40 XP per donation.
--
-- Units on donations:
--   · gross_amount  — RUBLES (set by handleDonate / handleGuestSbpDonate)
--   · amount        — KOPECKS (gross_rub * 100)
-- RPC prefers gross_amount; falls back to amount/100.
--
-- Call site today: right after INSERT with status='paid' (JS handlers, next PR).
-- Future ЮKassa webhook (pending → paid): call the SAME RPC
--   SELECT * FROM public.grant_donation_xp(<donation_id>);
-- Idempotency lives entirely inside this function — no rewrite needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1 ── columns ───────────────────────────────────────────────────────────────

ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS xp_granted  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS xp_awarded  INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.donations.xp_granted IS
  'True after fighter_stats XP was applied exactly once for this donation.';
COMMENT ON COLUMN public.donations.xp_awarded IS
  'Audit: XP granted to recipient (0 if not yet / skipped).';

-- 2 ── level from total XP (mirrors lib/levels getRoundByXP / advanceFighterXp) ─

CREATE OR REPLACE FUNCTION public.wp_derive_level(p_total_xp BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  xp BIGINT := GREATEST(0, COALESCE(p_total_xp, 0));
BEGIN
  -- Thresholds = ROUNDS[].xpRequired (FIB cumulative), highest match wins.
  IF xp >= 1771100 THEN RETURN 23; END IF;
  IF xp >= 1094600 THEN RETURN 22; END IF;
  IF xp >=  676500 THEN RETURN 21; END IF;
  IF xp >=  418100 THEN RETURN 20; END IF;
  IF xp >=  258400 THEN RETURN 19; END IF;
  IF xp >=  159700 THEN RETURN 18; END IF;
  IF xp >=   98700 THEN RETURN 17; END IF;
  IF xp >=   61000 THEN RETURN 16; END IF;
  IF xp >=   37700 THEN RETURN 15; END IF;
  IF xp >=   23300 THEN RETURN 14; END IF;
  IF xp >=   14400 THEN RETURN 13; END IF;
  IF xp >=    8900 THEN RETURN 12; END IF;
  IF xp >=    5500 THEN RETURN 11; END IF;
  IF xp >=    3400 THEN RETURN 10; END IF;
  IF xp >=    2100 THEN RETURN  9; END IF;
  IF xp >=    1300 THEN RETURN  8; END IF;
  IF xp >=     800 THEN RETURN  7; END IF;
  IF xp >=     500 THEN RETURN  6; END IF;
  IF xp >=     300 THEN RETURN  5; END IF;
  IF xp >=     200 THEN RETURN  4; END IF;
  IF xp >=     100 THEN RETURN  3; END IF; -- R2 & R3 share threshold 100 (same as TS)
  RETURN 1;
END;
$$;

-- 3 ── donation XP formula (RUBLES in) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.wp_donation_xp_from_gross_rub(p_gross_rub BIGINT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(
    40,
    10 + FLOOR(GREATEST(0, COALESCE(p_gross_rub, 0)) / 100.0)
  )::INTEGER;
$$;

-- 4 ── atomic grant (THE single idempotent entry point) ──────────────────────
--
-- HOOK POINT FOR FUTURE YOOKASSA WEBHOOK:
--   When payment confirms and you UPDATE donations SET status='paid'
--   WHERE id=… AND status='pending', call:
--     PERFORM public.grant_donation_xp(donation_id);
--   Do NOT re-implement xp_granted logic in the webhook handler.
--
-- TODAY (INSERT already status='paid'):
--   After resilientInsert succeeds, call the same RPC with the new id.

CREATE OR REPLACE FUNCTION public.grant_donation_xp(p_donation_id UUID)
RETURNS TABLE (
  ok              BOOLEAN,
  already_granted BOOLEAN,
  xp_awarded      INTEGER,
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
  -- Resolve recipient + gross (RUB). Prefer gross_amount; else amount (kop)/100.
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

  -- Only paid donations mint XP (pending waits for webhook → paid → this RPC).
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

  -- Claim exactly once. If 0 rows → already granted → do not touch fighter_stats.
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

  -- Mirror advanceFighterXp + session-server upsert (no training_sessions row).
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
-- Server only (service_role bypasses RLS; PostgREST service key can RPC).
GRANT EXECUTE ON FUNCTION public.grant_donation_xp(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
