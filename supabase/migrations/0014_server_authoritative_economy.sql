-- Warrior Point · Migration 0014 — Server-authoritative economy
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- ⚠️ ВАЖНО: запускать ТОЛЬКО после того, как на сервере задан
-- SUPABASE_SERVICE_ROLE_KEY (Vercel → Environment Variables). После этой
-- миграции anon-ключ больше не может писать баланс/XP/донаты — все такие
-- записи идут через API-роуты приложения (service role):
--   · /api/donations/create   — донаты + баланс
--   · /api/splits/book        — бронь сплита, заработок тренера
--   · /api/session/complete   — тренировки + XP
--
-- Что закрывается:
--   1. profiles.balance / coach_earnings / iphone_tickets — только сервер.
--   2. fighter_stats XP-поля (total_xp, current_level, monthly_xp,
--      daily_streak) — только сервер.
--   3. INSERT в donations / training_sessions / split_bookings — только сервер.
-- ─────────────────────────────────────────────────────────────────────────────

-- 0 ── payment_intents: кто платил (для серверного начисления наград) ────────

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS fighter_id TEXT;

-- 1 ── profiles: деньги меняет только сервер ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.wp_block_money_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance THEN
      RAISE EXCEPTION 'balance can only be changed by the server';
    END IF;
    IF NEW.coach_earnings IS DISTINCT FROM OLD.coach_earnings THEN
      RAISE EXCEPTION 'coach_earnings can only be changed by the server';
    END IF;
    IF NEW.iphone_tickets IS DISTINCT FROM OLD.iphone_tickets THEN
      RAISE EXCEPTION 'iphone_tickets can only be changed by the server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_profiles_block_money_change ON public.profiles;
CREATE TRIGGER wp_profiles_block_money_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_money_change();

-- 2 ── fighter_stats: XP/уровень/стрик меняет только сервер ──────────────────

CREATE OR REPLACE FUNCTION public.wp_block_xp_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.total_xp      IS DISTINCT FROM OLD.total_xp
      OR NEW.current_level IS DISTINCT FROM OLD.current_level
      OR NEW.monthly_xp    IS DISTINCT FROM OLD.monthly_xp
      OR NEW.daily_streak  IS DISTINCT FROM OLD.daily_streak THEN
        RAISE EXCEPTION 'XP fields can only be changed by the server';
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      -- Self-provisioned stats rows start at zero; server sets real values.
      IF COALESCE(NEW.total_xp, 0)      <> 0
      OR COALESCE(NEW.monthly_xp, 0)    <> 0
      OR COALESCE(NEW.daily_streak, 0)  <> 0
      OR COALESCE(NEW.current_level, 1) > 1 THEN
        RAISE EXCEPTION 'XP fields can only be set by the server';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_fighter_stats_block_xp_change ON public.fighter_stats;
CREATE TRIGGER wp_fighter_stats_block_xp_change
  BEFORE INSERT OR UPDATE ON public.fighter_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_xp_change();

-- 3 ── Финансовые таблицы: INSERT только с сервера ───────────────────────────

CREATE OR REPLACE FUNCTION public.wp_block_client_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION '% rows can only be created by the server', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_donations_block_client_insert ON public.donations;
CREATE TRIGGER wp_donations_block_client_insert
  BEFORE INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_client_insert();

DROP TRIGGER IF EXISTS wp_training_sessions_block_client_insert ON public.training_sessions;
CREATE TRIGGER wp_training_sessions_block_client_insert
  BEFORE INSERT ON public.training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_client_insert();

DROP TRIGGER IF EXISTS wp_split_bookings_block_client_insert ON public.split_bookings;
CREATE TRIGGER wp_split_bookings_block_client_insert
  BEFORE INSERT ON public.split_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_client_insert();

NOTIFY pgrst, 'reload schema';
