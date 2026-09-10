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
  -- Многоразовый код: одна ссылка на всю рассылку. Флаг used для него не жгут,
  -- «один бонус в одни руки» держит уникальный индекс по user_bonuses ниже.
  is_multi_use BOOLEAN NOT NULL DEFAULT FALSE,
  uses_count   INTEGER NOT NULL DEFAULT 0,
  -- Потолок выдач. NULL = без лимита. Для многоразового кода это лимит денег:
  -- max_uses * bonus_amount — максимум, который платформа обязана отдать.
  max_uses     INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Для баз, где таблица уже создана прошлым запуском.
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS is_multi_use BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS uses_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS max_uses     INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS invites_code_uidx ON public.invites (UPPER(code));

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_bonus_amount_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_bonus_amount_check
  CHECK (bonus_amount > 0 AND bonus_amount <= 5000);

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_max_uses_check;
ALTER TABLE public.invites ADD CONSTRAINT invites_max_uses_check
  CHECK (max_uses IS NULL OR max_uses > 0);

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

-- Supabase по умолчанию выдаёт anon/authenticated права на новые таблицы в public.
-- Без REVOKE нас держит только RLS. Для денег этого мало.
REVOKE ALL ON public.invites      FROM anon, authenticated;
REVOKE ALL ON public.user_bonuses FROM anon, authenticated;

-- ── 3. Атомарное зачисление ──────────────────────────────────────────────────
--
-- Почему RPC, а не 4 отдельных запроса из API:
--   два параллельных запроса с одним кодом могли бы начислить бонус дважды.
--   Здесь инвайт «захватывается» одним UPDATE ... WHERE used = false.

-- Без DROP повторный Run упадёт, если когда-нибудь поменяется список колонок
-- в RETURNS TABLE: «cannot change return type of existing function».
DROP FUNCTION IF EXISTS public.wp_redeem_invite_bonus(TEXT, TEXT);

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
  v_multi           BOOLEAN;
  v_prev_code       TEXT;
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

  v_multi := COALESCE(v_invite.is_multi_use, false);

  -- Повторный клик того же человека по тому же коду — не ошибка и не вторые деньги.
  SELECT ub.invite_code INTO v_prev_code
  FROM public.user_bonuses ub
  WHERE ub.user_id = v_user AND ub.source = 'invite'
  LIMIT 1;

  IF FOUND THEN
    IF UPPER(COALESCE(v_prev_code, '')) = v_code THEN
      RETURN QUERY SELECT true, true, v_invite.bonus_amount, NULL::BIGINT,
        v_invite.inviter_id, 0, 'already granted'::TEXT;
    ELSE
      RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
        'signup bonus already received'::TEXT;
    END IF;
    RETURN;
  END IF;

  IF v_invite.inviter_id IS NOT NULL AND v_invite.inviter_id = v_user THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
      'self invite'::TEXT;
    RETURN;
  END IF;

  -- Одноразовый код гаснет после первого бойца. Многоразовый живёт до лимита.
  IF NOT v_multi AND v_invite.used THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
      'invite already used'::TEXT;
    RETURN;
  END IF;

  IF v_multi
     AND v_invite.max_uses IS NOT NULL
     AND COALESCE(v_invite.uses_count, 0) >= v_invite.max_uses THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
      'invite limit reached'::TEXT;
    RETURN;
  END IF;

  v_amount := v_invite.bonus_amount;

  -- Захват инвайта одним UPDATE. 0 строк → успели раньше в параллельной транзакции.
  IF v_multi THEN
    UPDATE public.invites
    SET uses_count = COALESCE(uses_count, 0) + 1,
        used_at    = NOW()
    WHERE UPPER(code) = v_code
      AND (max_uses IS NULL OR COALESCE(uses_count, 0) < max_uses);
  ELSE
    UPDATE public.invites
    SET used       = true,
        used_by    = v_user,
        used_at    = NOW(),
        uses_count = COALESCE(uses_count, 0) + 1
    WHERE UPPER(code) = v_code
      AND used = false;
  END IF;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN QUERY SELECT false, false, 0, NULL::BIGINT, v_invite.inviter_id, 0,
      (CASE WHEN v_multi THEN 'invite limit reached' ELSE 'invite already used' END)::TEXT;
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

-- Многоразовый: одна ссылка на всю рассылку, но бонус — один в одни руки.
-- max_uses = 100 → потолок обязательств 100 × 300 ₽ = 30 000 ₽.
-- Поднять лимит:  UPDATE public.invites SET max_uses = 500 WHERE code = 'COBRA-5429';
-- Снять совсем:   UPDATE public.invites SET max_uses = NULL WHERE code = 'COBRA-5429';
INSERT INTO public.invites (code, inviter_id, bonus_amount, is_multi_use, max_uses)
VALUES ('COBRA-5429', 'WP-INTL-X9-441K', 300, TRUE, 100)
ON CONFLICT DO NOTHING;

-- Если строка осталась с прошлого запуска одноразовой — чиним и снимаем «сгорел».
-- max_uses трогаем только у старой одноразовой строки: если вы сняли лимит
-- вручную, повторный Run не вернёт его обратно.
UPDATE public.invites
SET is_multi_use = TRUE,
    max_uses     = CASE WHEN is_multi_use THEN max_uses ELSE COALESCE(max_uses, 100) END,
    used         = FALSE,
    used_by      = NULL
WHERE UPPER(code) = 'COBRA-5429';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- Проверка (безопасная, ничего не меняет):
--   SELECT code, used, uses_count, max_uses, is_multi_use FROM public.invites;
--
-- Тестовое начисление тратит одну выдачу из лимита и создаёт живую строку с деньгами.
-- На проде так делать не нужно, но если сделали — вот уборка:
--   SELECT * FROM public.wp_redeem_invite_bonus('COBRA-5429', 'TEST-USER-1');
--   DELETE FROM public.user_bonuses WHERE user_id = 'TEST-USER-1';
--   UPDATE public.profiles SET balance = 0 WHERE id = 'TEST-USER-1';
--   UPDATE public.invites SET uses_count = uses_count - 1 WHERE UPPER(code) = 'COBRA-5429';
--
-- Сколько уже раздали по коду:
--   SELECT uses_count, max_uses, uses_count * bonus_amount AS rub_outstanding
--   FROM public.invites WHERE UPPER(code) = 'COBRA-5429';
-- ─────────────────────────────────────────────────────────────────────────────
