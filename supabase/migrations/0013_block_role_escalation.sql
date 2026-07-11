-- Warrior Point · Migration 0013 — Block privilege escalation from the client
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why: the demo exposes blanket anon write policies. The single most dangerous
-- vector is a client (anon key) escalating itself to `admin`/`coach` via
-- `UPDATE profiles SET role='admin'`. This trigger blocks any role change made
-- by the anon/authenticated client while still allowing the service role
-- (server) to manage roles. Balance/XP hardening is a separate, larger step —
-- see the launch checklist; those must move to server-authoritative writes
-- before real money flows.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.wp_block_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses this guard; anon/authenticated cannot change role.
  IF auth.role() <> 'service_role' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role changes are not allowed from the client';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_profiles_block_role_change ON public.profiles;
CREATE TRIGGER wp_profiles_block_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_role_change();

-- Prevent inserting a privileged profile directly from the client:
-- new self-provisioned rows must be plain fighters.
CREATE OR REPLACE FUNCTION public.wp_block_privileged_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NEW.role <> 'fighter' THEN
    RAISE EXCEPTION 'only fighter profiles can be created from the client';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wp_profiles_block_privileged_insert ON public.profiles;
CREATE TRIGGER wp_profiles_block_privileged_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.wp_block_privileged_insert();

NOTIFY pgrst, 'reload schema';
