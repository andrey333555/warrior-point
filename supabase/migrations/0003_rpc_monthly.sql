-- Warrior Point · Day-3 migration — Server-side monthly XP aggregation
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent (DROP … IF EXISTS before CREATE).
-- ---------------------------------------------------------------

-- ── RPC: get_monthly_xp_leaders ──────────────────────────────────────────
-- Returns top N fighters ranked by XP earned in the last `days` days.
-- Uses a true server-side SUM aggregation — no client-side fan-out.
--
-- Usage:  SELECT * FROM get_monthly_xp_leaders(30, 10);
-- JS SDK: client.rpc('get_monthly_xp_leaders', { days_back: 30, top_n: 10 })

DROP FUNCTION IF EXISTS public.get_monthly_xp_leaders(INTEGER, INTEGER);

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

-- Grant execute to anon role so the frontend can call it without auth.
GRANT EXECUTE ON FUNCTION public.get_monthly_xp_leaders(INTEGER, INTEGER)
  TO anon;

-- Refresh PostgREST schema cache.
NOTIFY pgrst, 'reload schema';
