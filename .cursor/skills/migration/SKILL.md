---
name: migration
description: Writes a new Supabase migration for Warrior Point following this repo's conventions — sequential numbering, idempotent DDL, closed RLS, service_role-only grants, atomic money RPCs. Use when adding or changing a table, column, index, policy, or RPC.
disable-model-invocation: true
---

# Новая миграция

## Шаг 1. Узнай номер

```bash
ls supabase/migrations | tail -5
```

Следующий файл — `NNNN_короткое_имя_на_английском.sql`, номер строго следующий по порядку. Не переиспользуй занятый номер: миграции применяются в лексическом порядке.

## Шаг 2. Проверь, что уже есть

Прочитай миграции, которые трогали эту таблицу. Колонка могла появиться позже, чем таблица. `0001` — не вся правда.

Опорные точки этого репозитория:

| Файл | Что задаёт |
|---|---|
| `0013` | запрет смены роли и привилегированных вставок |
| `0014` | триггеры: деньги и XP меняет только `service_role` |
| `0015`+ | атомарные RPC экономики |

## Шаг 3. Скелет

```sql
-- NNNN_имя.sql
-- Зачем: одна строка на русском.

CREATE TABLE IF NOT EXISTS public.имя (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS имя_поле_uidx ON public.имя (поле);

ALTER TABLE public.имя ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "имя_no_anon" ON public.имя;
-- Политик нет = доступ только через service_role. Так и надо для денег.

NOTIFY pgrst, 'reload schema';
```

## Обязательные правила

- **`profiles.id` — TEXT.** Никогда `REFERENCES auth.users(id)` и никогда UUID для id пользователя.
- **Идемпотентность.** `IF NOT EXISTS` для таблиц и индексов, `DROP ... IF EXISTS` перед `ADD CONSTRAINT` и перед `CREATE POLICY`. Миграцию могут применить дважды.
- **RLS включена всегда.** Для денег, бонусов, инвайтов политик не добавляй — пусть ходит только service role.
- **`NOTIFY pgrst, 'reload schema';`** последней строкой, иначе PostgREST не увидит новое.
- **Не ломай прошлое.** Никаких `DROP COLUMN` и `DROP TABLE` без явной просьбы владельца.
- **Не трогай** комиссию 19/81, формулу Фибоначчи, `app/api/payment/*`.

## Если это RPC про деньги, XP или списание

Всё в одной транзакции, иначе двойное начисление при двойном клике.

```sql
CREATE OR REPLACE FUNCTION public.wp_имя(p_code TEXT, p_user_id TEXT)
RETURNS TABLE (ok BOOLEAN, amount INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Захват одним UPDATE с условием: второй вызов вернёт 0 строк.
  UPDATE public.invites SET used = TRUE, used_by = p_user_id, used_at = NOW()
  WHERE code = p_code AND used = FALSE
  RETURNING bonus_amount INTO v_amount;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'already_used';
    RETURN;
  END IF;
  -- дальше начисление
END;
$$;

REVOKE ALL ON FUNCTION public.wp_имя(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wp_имя(TEXT, TEXT) TO service_role;
```

`SECURITY DEFINER` без `SET search_path = public` — дыра. Забирай права у `PUBLIC`, `anon`, `authenticated` явно.

## Шаг 4. Код на стороне сервера

Пишет только `createWarriorServiceClient()` из `lib/supabase/server-admin.ts`. Он возвращает `null`, если ключа нет — тогда роут отвечает `503` с текстом «примените миграцию NNNN», а не `500`.

Личность — из сессии: `requireBoundUserId()` из `lib/api-session.ts`. `userId` из тела запроса не принимать никогда.

## Шаг 5. Скажи владельцу

Миграция сама не применяется. Заканчивай так:

> Файл `supabase/migrations/NNNN_имя.sql` создан. Применить: Supabase → SQL Editor → вставить файл → Run. До этого фича отвечает 503, деньги не теряются.

Затем позови субагента `schema-truth` для сверки и `prod-blocker`, если задеты RLS или env.
