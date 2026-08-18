-- Warrior Point · Migration 0020 — Lock down anon RLS (launch)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- ⚠️ После миграции ВСЕ записи баланса/донатов/броней/сессий идут ТОЛЬКО
-- через API с SUPABASE_SERVICE_ROLE_KEY. Anon-ключ из бандла остаётся
-- только на чтение публичных данных.
--
-- Без этой миграции любой, кто вытащил NEXT_PUBLIC_SUPABASE_ANON_KEY,
-- может UPDATE/DELETE почти всё (старые FOR ALL политики).
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles: anon read public cards only; no write
DROP POLICY IF EXISTS "warrior_anon_profiles_write" ON public.profiles;
DROP POLICY IF EXISTS "warrior_anon_profiles_all" ON public.profiles;
DROP POLICY IF EXISTS "warrior_anon_profiles_select" ON public.profiles;
CREATE POLICY "warrior_anon_profiles_select"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (
    COALESCE(visibility, 'public') IN ('public', 'limited')
    AND COALESCE(fighter_status, '') <> 'Deleted'
  );

-- fighter_stats: read-only for anon
DROP POLICY IF EXISTS "warrior_anon_fighter_stats_write" ON public.fighter_stats;
DROP POLICY IF EXISTS "warrior_anon_fighter_stats_all" ON public.fighter_stats;
DROP POLICY IF EXISTS "warrior_anon_fighter_stats_select" ON public.fighter_stats;
CREATE POLICY "warrior_anon_fighter_stats_select"
  ON public.fighter_stats
  FOR SELECT
  TO anon
  USING (true);

-- training_sessions: no client insert
DROP POLICY IF EXISTS "warrior_anon_training_sessions_insert" ON public.training_sessions;
DROP POLICY IF EXISTS "warrior_anon_training_sessions_select" ON public.training_sessions;
CREATE POLICY "warrior_anon_training_sessions_select"
  ON public.training_sessions
  FOR SELECT
  TO anon
  USING (true);

-- fighter_awards
DROP POLICY IF EXISTS "warrior_anon_fighter_awards_write" ON public.fighter_awards;
DROP POLICY IF EXISTS "warrior_anon_fighter_awards_select" ON public.fighter_awards;
CREATE POLICY "warrior_anon_fighter_awards_select"
  ON public.fighter_awards
  FOR SELECT
  TO anon
  USING (true);

-- donations: read-only (writes via service role API)
DROP POLICY IF EXISTS "warrior_anon_donations_all" ON public.donations;
DROP POLICY IF EXISTS "warrior_anon_donations_select" ON public.donations;
CREATE POLICY "warrior_anon_donations_select"
  ON public.donations
  FOR SELECT
  TO anon
  USING (true);

-- splits
DROP POLICY IF EXISTS "warrior_anon_training_splits_all" ON public.training_splits;
DROP POLICY IF EXISTS "warrior_anon_training_splits_write" ON public.training_splits;
CREATE POLICY "warrior_anon_training_splits_select"
  ON public.training_splits
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "warrior_anon_split_bookings_all" ON public.split_bookings;
DROP POLICY IF EXISTS "warrior_anon_split_bookings_write" ON public.split_bookings;
CREATE POLICY "warrior_anon_split_bookings_select"
  ON public.split_bookings
  FOR SELECT
  TO anon
  USING (true);

-- organisations / fighter_orgs
DROP POLICY IF EXISTS "warrior_anon_fighter_orgs_all" ON public.fighter_orgs;
CREATE POLICY "warrior_anon_fighter_orgs_select"
  ON public.fighter_orgs
  FOR SELECT
  TO anon
  USING (true);

-- reviews stub
DROP POLICY IF EXISTS "warrior_anon_reviews_all" ON public.fighter_reviews;
DROP POLICY IF EXISTS "warrior_reviews_anon_all" ON public.fighter_reviews;
CREATE POLICY "warrior_anon_reviews_select"
  ON public.fighter_reviews
  FOR SELECT
  TO anon
  USING (true);

-- payment_intents: never expose to anon (service role only)
DROP POLICY IF EXISTS "warrior_anon_payment_intents_all" ON public.payment_intents;
DROP POLICY IF EXISTS "payment_intents_anon_all" ON public.payment_intents;
REVOKE ALL ON public.payment_intents FROM anon;
REVOKE ALL ON public.payment_intents FROM authenticated;

NOTIFY pgrst, 'reload schema';
