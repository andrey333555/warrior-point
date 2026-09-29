-- Warrior Point · prod-catchup-2.sql
-- Generated: concatenation of supabase/migrations/0024…0030, for a single
-- paste-and-run in Supabase Dashboard → SQL Editor → New query → Run.
--
-- Prod already has 0001-0022 + 0023_fix_rls_lockdown.sql applied (confirmed
-- working — that's what supabase/prod-catchup.sql was for). This file is ONLY
-- what's missing since: origin/main's independent security pass + new features
-- (donation goal, nickname, invite drafts, invite/bonus system, gyms catalog).
--
-- 0029_security_hardening.sql is origin/main's own migration, renamed from
-- "0023_security_hardening.sql" — that number collided with this branch's
-- already-applied 0023_fix_rls_lockdown.sql. Content unchanged except its
-- header comment.
--
-- 0030_reconcile_final_lockdown.sql is new: 0023_fix_rls_lockdown.sql (already
-- on prod) and 0029_security_hardening.sql (in this file) disagree on the final
-- RLS state of reviews/training_sessions/donations, and 0023's table sweep
-- doesn't know about gyms (0028, also in this file) — 0030 is the actual final
-- word, folding in the stricter policies from 0029 plus gyms support. See its
-- own header for the full explanation. After this file runs,
-- 0023_fix_rls_lockdown.sql must never be re-run in isolation again — 0030 is
-- what "re-apply the lockdown" should mean from now on.
--
-- Every individual file is idempotent, so this is safe to run even if some of
-- it already applied — re-running is a no-op.
--
-- DO NOT run this against production without reading it first.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 0024_donation_goal.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0024 — Public donation campaign title
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS donation_goal TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_donation_goal_len;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_donation_goal_len
  CHECK (donation_goal IS NULL OR char_length(btrim(donation_goal)) BETWEEN 1 AND 120);

-- Public card /fighter/romanov
UPDATE public.profiles
SET
  donation_goal = 'Сборы в Краснодар',
  updated_at    = NOW()
WHERE slug = 'romanov';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0025_nickname.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0025 — Public fighter nickname
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_nickname_len;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_nickname_len
  CHECK (nickname IS NULL OR char_length(btrim(nickname)) BETWEEN 1 AND 48);

UPDATE public.profiles
SET
  nickname   = 'Уличный Боец',
  updated_at = NOW()
WHERE slug = 'romanov';

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0026_fighter_invite_drafts.sql
-- ─────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────
-- 0027_invite_bonuses.sql
-- ─────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────
-- 0028_gyms.sql
-- ─────────────────────────────────────────────────────────────────────────
-- 0028_gyms.sql
-- Зачем: каталог залов в базе (раньше жил только в lib/gyms.ts) + сид БК «Кузня» · ЦСЕ «Сокол».

CREATE TABLE IF NOT EXISTS public.gyms (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'kuznya',
  network         TEXT NOT NULL DEFAULT 'kuznya',
  city            TEXT NOT NULL,
  address         TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  coach_id        TEXT REFERENCES public.profiles (id) ON DELETE SET NULL,
  coach_name      TEXT,
  specializations TEXT[] NOT NULL DEFAULT '{}',
  phone           TEXT,
  instagram       TEXT,
  website         TEXT,
  accent          TEXT NOT NULL DEFAULT 'cyan',
  pending         BOOLEAN NOT NULL DEFAULT FALSE,
  schedule        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_category_check;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_category_check
  CHECK (category IN ('kuznya', 'fight_club', 'wrestling', 'partner_slot'));

ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_network_check;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_network_check
  CHECK (network IN ('kuznya', 'nart', 'bulldog', 'samson', 'kickbox', 'independent'));

ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_accent_check;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_accent_check
  CHECK (accent IN ('cyan', 'fuchsia', 'amber', 'emerald', 'violet', 'rose'));

CREATE INDEX IF NOT EXISTS gyms_city_idx ON public.gyms (city);
CREATE INDEX IF NOT EXISTS gyms_network_idx ON public.gyms (network);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warrior_anon_gyms_select" ON public.gyms;
CREATE POLICY "warrior_anon_gyms_select"
  ON public.gyms FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.gyms FROM anon, authenticated;
GRANT SELECT ON public.gyms TO anon, authenticated;

-- БК «Кузня» · ЦСЕ «Сокол», Краснодар, ул. Береговая, 9
-- Координаты WGS-84: 45.015096, 38.966952 (2ГИС · спорткомплекс «Сокол»).
INSERT INTO public.gyms (
  id, name, category, network, city, address, lat, lng,
  coach_id, coach_name, specializations, phone, instagram, accent, pending, schedule
) VALUES (
  'kuznya-krd-sokol',
  'БК «Кузня»',
  'kuznya',
  'kuznya',
  'Краснодар',
  'ул. Береговая, 9 (ЦСЕ «Сокол»)',
  45.015096,
  38.966952,
  'WP-COACH-001',
  'Сергей Романов',
  ARRAY['Бокс', 'Тайский бокс', 'MMA', 'Рукопашный бой', 'Функциональный тренинг'],
  '+7 918 430-03-30',
  '@kuznya_fight_club',
  'cyan',
  FALSE,
  '[
    {"discipline":"Бокс","times":"Вт–Чт 17:30, Сб 09:00","phone":"+7 918 430-03-30"},
    {"discipline":"Тайский бокс","times":"Вт–Чт 19:00, Сб 11:00","phone":"+7 909 458-98-00"},
    {"discipline":"ММА / рукопашный (7–13 лет)","times":"Пн–Ср–Пт 17:30","phone":"+7 952 856-03-10, +7 952 465-71-56"},
    {"discipline":"Смешанные единоборства (14+)","times":"Пн–Ср–Пт 19:00","phone":"+7 900 286-58-30, +7 908 678-17-00"},
    {"discipline":"Функциональный тренинг","times":"Ср 16:00, Сб 10:00","phone":null}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  category        = EXCLUDED.category,
  network         = EXCLUDED.network,
  city            = EXCLUDED.city,
  address         = EXCLUDED.address,
  lat             = EXCLUDED.lat,
  lng             = EXCLUDED.lng,
  coach_id        = EXCLUDED.coach_id,
  coach_name      = EXCLUDED.coach_name,
  specializations = EXCLUDED.specializations,
  phone           = EXCLUDED.phone,
  instagram       = EXCLUDED.instagram,
  accent          = EXCLUDED.accent,
  pending         = EXCLUDED.pending,
  schedule        = EXCLUDED.schedule,
  updated_at      = NOW();

NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────
-- 0029_security_hardening.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0029 — Security hardening (idempotent)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Renumbered from origin/main's "0023_security_hardening.sql" — that number
-- was already taken on prod by this branch's own 0023_fix_rls_lockdown.sql
-- (applied independently, different RLS approach, see its own header). Body
-- unchanged from origin/main except this header. Apply strictly after 0028 —
-- relies on fighter_stats / fighter_awards / training_sessions anon-insert
-- already being locked down, which 0023_fix_rls_lockdown.sql (not this file)
-- did on prod. Its RLS section (part 9 below) is itself superseded by
-- 0030_reconcile_final_lockdown.sql, which re-sweeps everything one more
-- time to fold in gyms (0028) and this file's tighter policies together —
-- the money-safety functions in parts 1-8 below are the part that matters
-- long-term.
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

-- ─────────────────────────────────────────────────────────────────────────
-- 0030_reconcile_final_lockdown.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Warrior Point · Migration 0030 — Reconcile final lockdown
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent: safe to re-run.
--
-- Why this exists: this branch's own 0023_fix_rls_lockdown.sql and
-- origin/main's 0029_security_hardening.sql (renumbered — was "0023" there,
-- collided with this branch's 0023) both independently tightened RLS after
-- 0020 turned out broken. Applied in sequence, they disagree on the FINAL
-- state of a few tables:
--   · reviews            — 0023 here: USING(true). 0029: USING(status='published').
--   · training_sessions  — 0023 here: USING(true). 0029: USING(false)
--     (financial columns — public read is now via a view instead).
--   · donations          — same story; 0029 adds a donations_public view.
--   · gyms (new in 0028) — doesn't exist when 0023 here was written, so
--     0023's table sweep includes "gyms" with no matching recreate branch.
--     If 0023_fix_rls_lockdown.sql is ever re-run in isolation AFTER 0028,
--     it silently re-closes gyms and breaks the gym map/catalog.
--
-- This migration is the actual final word: same dynamic pg_policies sweep
-- mechanism as 0023_fix_rls_lockdown.sql (robust against arbitrary ad hoc
-- Dashboard-created policies, whatever they're named), extended to cover
-- the tables 0026-0028 introduced, with each table's policy set to the
-- correct — and where the two prior migrations disagreed, the STRICTER —
-- final definition.
--
-- ⚠️ After this runs: 0023_fix_rls_lockdown.sql must never be re-run in
-- isolation again — it would reopen reviews/training_sessions/donations and
-- re-close gyms, as described above. This file (0030) is what "re-apply the
-- lockdown" should mean from now on; re-running THIS one is always safe.
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. Sweep: drop every anon/public policy on every table we manage ───────

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'profiles', 'fighter_stats', 'training_sessions', 'fighter_awards',
        'donations', 'training_splits', 'split_bookings', 'fighter_orgs',
        'reviews', 'payment_intents', 'fights', 'gyms', 'sessions',
        'fighter_invite_drafts', 'invites', 'user_bonuses'
      ])
      AND (
        roles @> ARRAY['anon']::name[]
        OR roles @> ARRAY['public']::name[]
        OR roles @> ARRAY['authenticated']::name[]
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ── 2. profiles — unchanged from 0023: no anon table access, view instead ──

REVOKE ALL ON public.profiles FROM anon;

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  display_name,
  slug,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_bio, false)
       THEN bio ELSE NULL END AS bio,
  avatar_url,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_record, false)
       THEN record ELSE NULL END AS record,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_club, false)
       THEN club ELSE NULL END AS club,
  CASE WHEN COALESCE(visibility, 'public') = 'public'
         AND NOT COALESCE(hide_weight_class, false)
       THEN weight_class ELSE NULL END AS weight_class,
  donations_total,
  (COALESCE(visibility, 'public') = 'public' AND COALESCE(booking_enabled, true)) AS booking_enabled,
  visibility,
  hide_weight_class,
  hide_club,
  hide_bio,
  hide_record,
  verification_status,
  created_at,
  updated_at
FROM public.profiles
WHERE COALESCE(visibility, 'public') IN ('public', 'limited')
  AND COALESCE(fighter_status, '') <> 'Deleted';

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ── 3. Per-table final policies (to_regclass-guarded — skip missing tables) ─

DO $$ BEGIN
  IF to_regclass('public.fighter_stats') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_stats_select"
      ON public.fighter_stats FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- training_sessions: financial columns — closed. Was USING(true) in 0023,
-- 0029 tightened to USING(false); that's the final word.
DO $$ BEGIN
  IF to_regclass('public.training_sessions') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_training_sessions_select"
      ON public.training_sessions FOR SELECT TO anon USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.fighter_awards') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_awards_select"
      ON public.fighter_awards FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- donations: financial columns — closed. Public reads go through
-- donations_public (created by 0029_security_hardening.sql).
DO $$ BEGIN
  IF to_regclass('public.donations') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_donations_select"
      ON public.donations FOR SELECT TO anon USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.training_splits') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_training_splits_select"
      ON public.training_splits FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.split_bookings') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_split_bookings_select"
      ON public.split_bookings FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.fighter_orgs') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_fighter_orgs_select"
      ON public.fighter_orgs FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- reviews: published only. Was USING(true) in 0023, 0029 tightened to
-- status='published'; that's the final word.
DO $$ BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_reviews_select"
      ON public.reviews FOR SELECT TO anon USING (status = 'published');
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.payment_intents') IS NOT NULL THEN
    CREATE POLICY "payment_intents_no_public"
      ON public.payment_intents FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
    REVOKE ALL ON public.payment_intents FROM anon;
    REVOKE ALL ON public.payment_intents FROM authenticated;
  END IF;
END $$;

-- gyms (0028): real anon-facing feature (map/catalog) — must stay open, or
-- any future re-run of the sweep above silently breaks it.
DO $$ BEGIN
  IF to_regclass('public.gyms') IS NOT NULL THEN
    CREATE POLICY "warrior_anon_gyms_select"
      ON public.gyms FOR SELECT TO anon, authenticated USING (true);
    GRANT SELECT ON public.gyms TO anon, authenticated;
  END IF;
END $$;

-- fighter_invite_drafts / invites / user_bonuses (0026/0027): service_role
-- only, by design — swept above for defense-in-depth, no policy re-created,
-- and explicitly re-REVOKE in case Supabase's default per-table grant to
-- anon/authenticated ever got re-applied by something else.
DO $$ BEGIN
  IF to_regclass('public.fighter_invite_drafts') IS NOT NULL THEN
    REVOKE ALL ON public.fighter_invite_drafts FROM anon, authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.invites') IS NOT NULL THEN
    REVOKE ALL ON public.invites FROM anon, authenticated;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.user_bonuses') IS NOT NULL THEN
    REVOKE ALL ON public.user_bonuses FROM anon, authenticated;
  END IF;
END $$;

-- fights / sessions: still not referenced anywhere in app code (rechecked
-- against the full origin/main tree, not just its new files) — swept
-- above, no policy re-created here → RLS enabled + zero policies = fully
-- closed to anon and authenticated. Service role is unaffected either way.

NOTIFY pgrst, 'reload schema';

