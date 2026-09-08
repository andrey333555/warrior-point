-- Warrior Point · Migration 0027 — Invite codes + signup bonuses
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- ⚠️ Отличия от «типовой» схемы:
--   · В проекте НЕТ Supabase Auth как источника истины — id профиля это TEXT
--     ('WP-INTL-X9-441K', telegram id, oauth sub). Поэтому НЕ auth.users(id) UUID.
--   · Начисление денег и XP идёт только через service_role (миграция 0014).
--     Клиент не может писать balance / total_xp напрямую.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Таблицы ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL,
  inviter_id   TEXT REFERENCES public.profiles (id) ON DELETE SET NULL,
  bonus_amount INTEGER NOT NULL DEFAULT 300,
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  used_by      TEXT REFERENCES public.profiles (id) ON DELETE SET NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS invites_code_uidx ON public.invites (UPPER(code));

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_bonus_amount_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_bonus_amount_check
  CHECK (bonus_amount > 0 AND bonus_amount <= 5000);

CREATE TABLE IF NOT EXISTS public.user_bonuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  source      TEXT NOT NULL,
  invite_code TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Один приветственный бонус на пользователя. Навсегда.
CREATE UNIQUE INDEX IF NOT EXISTS user_bonuses_one_invite_per_user_uidx
  ON public.user_bonuses (user_id)
  WHERE source = 'invite';

CREATE INDEX IF NOT EXISTS user_bonuses_user_idx ON public.user_bonuses (user_id);

-- ── 2. RLS: только сервер ────────────────────────────────────────────────────
-- Политик для anon / authenticated нет — работает лишь service_role.

ALTER TABLE public.invites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bonuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_invites_write"      ON public.invites;
DROP POLICY IF EXISTS "warrior_anon_user_bonuses_write" ON public.user_bonuses;

-- ── 3. Атомарное зачисление ──────────────────────────────────────────────────
--
-- Почему RPC, а не 4 отдельных запроса из API:
--   два параллельных запроса с одним кодом могли бы начислить бонус дважды.
--   Здесь инвайт «захватывается» одним UPDATE ... WHERE used = false.

CREATE OR REPLACE FUNCTION public.wp_redeem_invite_bonus(
  p_code    TEXT,
  p_user_id TEXT
)
RETURNS TABLE (
  ok              BOOLEAN,
  already_granted BOOLEAN,
  amount          INTEGER,
  new_balance     BIGINT,
  inviter_id      TEXT,
  inviter_xp      INTEGER,
  message         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code            TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  v_user            TEXT := TRIM(COALESCE(p_user_id, ''));
  v_invite          public.invites;
  v_rows            INTEGER;
  v_amount          INTEGER;
  v_balance         BIGINT;
  v_inviter_xp      INTEGER := 100;
  v_total_before    BIGINT;
  v_monthly_before  BIGINT;
  v_total_after     BIGINT;
  v_level_after     INTEGER;
BEGIN
  IF v_code = '' OR v_user = '' THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, NULL::TEXT, 0,
      'code and user required'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_invite
  FROM public.invites
  WHERE UPPER(code) = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, NULL::TEXT, 0,
      'invite not found'::TEXT;
    RETURN;
  END IF;

  -- Повторный вызов тем же пользователем — не ошибка и не второе начисление.
  IF v_invite.used AND v_invite.used_by = v_user THEN
    RETURN QUERY SELECT true, true, v_invite.bonus_amount, NULL::BIGINT,
      v_invite.inviter_id, 0, 'already granted'::TEXT;
    RETURN;
  END IF;

  IF v_invite.used THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
      'invite already used'::TEXT;
    RETURN;
  END IF;

  IF v_invite.inviter_id IS NOT NULL AND v_invite.inviter_id = v_user THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
      'self invite'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_bonuses
    WHERE user_id = v_user AND source = 'invite'
  ) THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
      'signup bonus already received'::TEXT;
    RETURN;
  END IF;

  v_amount := v_invite.bonus_amount;

  -- Захват инвайта. 0 строк → кто-то успел раньше в параллельной транзакции.
  UPDATE public.invites
  SET used    = true,
      used_by = v_user,
      used_at = NOW()
  WHERE UPPER(code) = v_code
    AND used = false;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
      'invite already used'::TEXT;
    RETURN;
  END IF;

  -- Профиль может отсутствовать (свежий OAuth без provision) — создаём минимальный.
  INSERT INTO public.profiles (id, display_name, role, updated_at)
  VALUES (v_user, 'Воин', 'fighter', NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_bonuses (user_id, amount, source, invite_code)
  VALUES (v_user, v_amount, 'invite', v_invite.code);

  UPDATE public.profiles
  SET balance    = COALESCE(balance, 0) + v_amount,
      updated_at = NOW()
  WHERE id = v_user
  RETURNING balance INTO v_balance;

  -- Реферальный бонус пригласившему: +100 Талантов.
  IF v_invite.inviter_id IS NOT NULL THEN
    SELECT COALESCE(fs.total_xp, 0), COALESCE(fs.monthly_xp, 0)
    INTO v_total_before, v_monthly_before
    FROM public.fighter_stats fs
    WHERE fs.fighter_id = v_invite.inviter_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_total_before := 0;
      v_monthly_before := 0;
    END IF;

    v_total_after := v_total_before + v_inviter_xp;
    v_level_after := public.wp_derive_level(v_total_after);

    INSERT INTO public.fighter_stats (
      fighter_id, total_xp, current_level, monthly_xp, updated_at
    )
    VALUES (
      v_invite.inviter_id,
      v_total_after,
      v_level_after,
      v_monthly_before + v_inviter_xp,
      NOW()
    )
    ON CONFLICT (fighter_id) DO UPDATE
    SET total_xp      = EXCLUDED.total_xp,
        current_level = EXCLUDED.current_level,
        monthly_xp    = EXCLUDED.monthly_xp,
        updated_at    = EXCLUDED.updated_at;
  ELSE
    v_inviter_xp := 0;
  END IF;

  RETURN QUERY SELECT true, false, v_amount, v_balance,
    v_invite.inviter_id, v_inviter_xp, 'granted'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.wp_redeem_invite_bonus(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wp_redeem_invite_bonus(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.wp_redeem_invite_bonus(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.wp_redeem_invite_bonus(TEXT, TEXT) TO service_role;

-- ── 4. Демо-код для проверки воронки на запуске ───────────────────────────────
-- Реферальные коды сейчас генерируются на клиенте и в базу не попадают.
-- Без строки в invites любой redeem вернёт «invite not found».

INSERT INTO public.invites (code, inviter_id, bonus_amount)
VALUES ('COBRA-5429', 'WP-INTL-X9-441K', 300)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- Проверка:
--   SELECT code, used, used_by, bonus_amount FROM public.invites;
--   SELECT * FROM public.wp_redeem_invite_bonus('COBRA-5429', 'TEST-USER-1');
--   SELECT user_id, amount, source FROM public.user_bonuses;
-- Повторный вызов с тем же пользователем → already_granted = true, без денег.
-- ─────────────────────────────────────────────────────────────────────────────
