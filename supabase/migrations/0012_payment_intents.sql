-- Warrior Point · Migration 0012 — Persistent payment intents
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why: payment intents previously lived in server memory (globalThis). On
-- serverless (Vercel) `create`, `webhook`, `mock-pay` and `confirm` can hit
-- different instances, so the intent vanished and rewards never applied.
-- This table is the authoritative store, written only by the service role.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id             TEXT        PRIMARY KEY,
  yookassa_id    TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'succeeded', 'canceled')),
  trainer_id     INTEGER     NOT NULL,
  trainer_name   TEXT        NOT NULL,
  gym_name       TEXT        NOT NULL,
  session_date   TEXT        NOT NULL,
  session_time   TEXT        NOT NULL,
  training_type  TEXT        NOT NULL,
  gross_rub      BIGINT      NOT NULL CHECK (gross_rub > 0),
  booking_id     TEXT        NOT NULL,
  breakdown      JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_intents_yookassa_idx
  ON public.payment_intents (yookassa_id);

-- RLS: locked to the service role only. No anon/authenticated access —
-- all reads/writes go through server API routes.
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_intents_no_public" ON public.payment_intents;
CREATE POLICY "payment_intents_no_public"
  ON public.payment_intents
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

NOTIFY pgrst, 'reload schema';
