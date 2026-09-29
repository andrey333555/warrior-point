-- Warrior Point · Migration 0026 — Draft fighter passports + invite codes
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.fighter_invite_drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code   TEXT NOT NULL,
  profile_id    TEXT NOT NULL,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  city          TEXT,
  club          TEXT,
  style         TEXT,
  weight        NUMERIC,
  height        NUMERIC,
  record        TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS fighter_invite_drafts_code_uidx
  ON public.fighter_invite_drafts (invite_code);
CREATE UNIQUE INDEX IF NOT EXISTS fighter_invite_drafts_profile_uidx
  ON public.fighter_invite_drafts (profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS fighter_invite_drafts_slug_uidx
  ON public.fighter_invite_drafts (slug);

ALTER TABLE public.fighter_invite_drafts
  DROP CONSTRAINT IF EXISTS fighter_invite_drafts_status_check;
ALTER TABLE public.fighter_invite_drafts
  ADD CONSTRAINT fighter_invite_drafts_status_check
  CHECK (status IN ('draft', 'invited', 'activated'));

ALTER TABLE public.fighter_invite_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fighter_invite_drafts_no_anon" ON public.fighter_invite_drafts;
-- No anon/authenticated policies: only service_role (bypasses RLS).

NOTIFY pgrst, 'reload schema';
